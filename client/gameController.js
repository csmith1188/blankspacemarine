import { CONCEPT_METADATA } from '../core/puzzles.js';
import { buildMarineSvg } from './fx/spaceMarineFx.js';

const DESTROY_BARKS = [
  '"Direct hit! Another rogue space vaporized!"',
  '"Plasma on target! Keep those columns razor-sharp!"',
  '"No mercy for stray whitespace, Cadet!"',
  '"Clean shot! PEP 8 approves!"'
];

const TAB_BARKS = [
  '"Alien Tab character obliterated! Four spaces only!"',
  '"TabError threat neutralized! Good eye, Marine!"'
];

const CLEAR_BARKS = [
  '"SECTOR PURGED! Moving to next Python target!"',
  '"Flawless indentation discipline! Keep the speed up!"',
  '"Python syntax locked and green! Next mission incoming!"'
];

const ERROR_BARKS = [
  '"Hold up, Cadet! Check the Python Diagnostic Terminal below."',
  '"Indentation breach detected! Inspect the highlighted line."',
  '"Not quite clean yet — read the Python error and strike again!"'
];

function formatDuration(ms) {
  const safe = Math.max(0, Math.floor(ms));
  const totalTenths = Math.floor(safe / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class GameController {
  constructor({ service, editor, fx, dom }) {
    this.service = service;
    this.editor = editor;
    this.fx = fx;
    this.dom = dom;

    this.state = 'BRIEFING'; // BRIEFING | PLAYING | PAUSED | TRANSITION | DEBRIEF
    this.runId = null;
    this.runStartedAtMs = 0;
    this.pausedAtMs = null;
    this.totalPausedMs = 0;
    this.isTogglingPause = false;
    this.activePuzzle = null;
    this.lastRunOptions = { callsign: 'CADET-01', sector: 'all' };
    this.timerInterval = null;
    this.isSubmitting = false;
    this.hazardVisionCharges = 0;
  }

  async init() {
    if (this.dom.startMarinePreview) {
      this.dom.startMarinePreview.innerHTML = buildMarineSvg();
    }

    const [campaigns, sectors] = await Promise.all([
      this.service.getCampaigns(),
      this.service.getSectors()
    ]);
    this._populateDeployments(campaigns, sectors);
    await this._refreshLeaderboards();
  }

  _populateDeployments(campaigns, sectors) {
    const select = this.dom.selectSector;
    if (!select) return;
    select.innerHTML = '';

    const campGroup = document.createElement('optgroup');
    campGroup.label = 'CAMPAIGNS';
    for (const c of campaigns) {
      const opt = document.createElement('option');
      opt.value = `campaign:${c.id}`;
      opt.textContent = `${c.name} (${c.missionCount} Missions)`;
      campGroup.appendChild(opt);
    }
    select.appendChild(campGroup);

    const sectorGroup = document.createElement('optgroup');
    sectorGroup.label = 'MAIN CAMPAIGN — INDIVIDUAL SECTORS';
    for (const sector of sectors) {
      const opt = document.createElement('option');
      opt.value = `sector:${sector.id}`;
      opt.textContent = `${sector.name} — ${sector.subtitle} (${sector.missionCount || 0} Missions)`;
      sectorGroup.appendChild(opt);
    }
    select.appendChild(sectorGroup);
  }

  async startRun(options = {}) {
    this.lastRunOptions = {
      callsign: options.callsign || this.dom.inputCallsign?.value || 'CADET-01',
      sector: options.sector || this.dom.selectSector?.value || 'all'
    };

    const session = await this.service.startRun(this.lastRunOptions);
    this.runId = session.runId;
    this.runStartedAtMs = session.startedAtMs;
    this.pausedAtMs = null;
    this.totalPausedMs = 0;
    this.isTogglingPause = false;
    this.state = 'PLAYING';
    this.isSubmitting = false;
    this.hazardVisionCharges = 0;
    this._syncHazardVisionUi();
    this._syncPauseUi(false);

    this.dom.modalStart.classList.add('hidden');
    if (this.dom.gameWorkspace) this.dom.gameWorkspace.classList.remove('hidden');
    this.dom.modalDebrief.classList.add('hidden');
    this.dom.clearBanner.classList.add('hidden');

    this._updateHud({
      score: session.score,
      streak: session.streak,
      rank: session.rank
    });

    this._startTimer();
    this._loadPuzzle(session.puzzle);
    this._setDialogue('"Deployment complete! Purge all whitespace errors and press Ctrl+Enter to test."', 'READY', 'status-ready');
  }

  _loadPuzzle(puzzle) {
    this.activePuzzle = puzzle;
    this.dom.hudMission.textContent = `${puzzle.index + 1} / ${puzzle.total}`;
    this.dom.missionSector.textContent = puzzle.sectorName.toUpperCase();
    this.dom.missionPar.textContent = `PAR: ${(puzzle.parTimeMs / 1000).toFixed(1)}s`;
    this.dom.missionTitle.textContent = puzzle.title;
    this.dom.missionBriefing.textContent = puzzle.briefing;

    this.dom.missionConcepts.innerHTML = puzzle.concepts
      .map((id) => {
        const label = CONCEPT_METADATA[id]?.label || id;
        return `<span class="concept-chip">${escapeHtml(label)}</span>`;
      })
      .join('');

    this.dom.terminalStatus.textContent = 'STANDBY';
    this.dom.terminalOutput.innerHTML =
      '<p class="term-muted">Fix the Python whitespace above, then press <strong>Ctrl+Enter</strong> (or click <strong>PURGE &amp; TEST</strong>).</p>';

    this.editor.setLocked(false);
    this.editor.setCode(puzzle.brokenCode);
    this.editor.focus();
  }

  resetCurrentPuzzle() {
    if (this.state !== 'PLAYING' || !this.activePuzzle) return;
    this.editor.setCode(this.activePuzzle.brokenCode);
    this.editor.focus();
    this._setDialogue('"Puzzle reset to initial contaminated state. Take aim again!"', 'READY', 'status-ready');
  }

  async togglePause() {
    if (this.state === 'PAUSED') {
      return this.resumeGame();
    }
    if (this.state === 'PLAYING') {
      return this.pauseGame();
    }
  }

  async pauseGame() {
    if (this.state !== 'PLAYING' || this.isSubmitting || this.isTogglingPause) return;
    this.isTogglingPause = true;
    try {
      this.state = 'PAUSED';
      this.pausedAtMs = Date.now();
      this.editor.setLocked(true);
      this.editor.blur();
      this._syncPauseUi(true);
      this._setDialogue('"Mission paused. Code display shielded and controls locked until you resume."', 'PAUSED', 'status-paused');
      if (this.runId && typeof this.service.pauseRun === 'function') {
        await this.service.pauseRun({ runId: this.runId }).catch(() => {});
      }
    } finally {
      this.isTogglingPause = false;
    }
  }

  async resumeGame() {
    if (this.state !== 'PAUSED' || this.isTogglingPause) return;
    this.isTogglingPause = true;
    try {
      if (this.runId && typeof this.service.resumeRun === 'function') {
        await this.service.resumeRun({ runId: this.runId }).catch(() => {});
      }
      if (this.pausedAtMs !== null) {
        this.totalPausedMs += Math.max(0, Date.now() - this.pausedAtMs);
        this.pausedAtMs = null;
      }
      this.state = 'PLAYING';
      this._syncPauseUi(false);
      this.editor.setLocked(false);
      this.editor.focus();
      this._setDialogue('"Stasis disengaged! Code unshielded — back to the purge, Marine!"', 'READY', 'status-ready');
    } finally {
      this.isTogglingPause = false;
    }
  }

  _syncPauseUi(isPaused) {
    if (this.dom.editorEl) {
      this.dom.editorEl.classList.toggle('is-paused', isPaused);
      this.dom.editorEl.setAttribute('aria-hidden', String(isPaused));
    }
    if (this.dom.pauseOverlay) {
      this.dom.pauseOverlay.classList.toggle('hidden', !isPaused);
    }
    if (this.dom.btnPause) {
      this.dom.btnPause.textContent = isPaused ? 'RESUME' : 'PAUSE';
      this.dom.btnPause.setAttribute('aria-pressed', String(isPaused));
      this.dom.btnPause.classList.toggle('is-paused-active', isPaused);
    }
    if (this.dom.btnHint) this.dom.btnHint.disabled = isPaused;
    if (this.dom.btnReset) this.dom.btnReset.disabled = isPaused;
    if (this.dom.btnSubmit) this.dom.btnSubmit.disabled = isPaused;
  }

  async submitCurrentPuzzle() {
    if (this.state !== 'PLAYING' || !this.activePuzzle || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const code = this.editor.getCode();
      const result = await this.service.submitAttempt({
        runId: this.runId,
        puzzleId: this.activePuzzle.id,
        code
      });

      this._updateHud({
        score: result.score,
        streak: result.streak,
        rank: result.rank
      });

      if (!result.valid) {
        this.fx.playErrorAlarm();
        this.editor.setErrorHighlights(result.verdict.issues);
        this._renderTerminalIssues(result.verdict.issues);
        this._setDialogue(randomFrom(ERROR_BARKS), 'ALERT', 'status-alert');
        this.editor.focus();
        return;
      }

      // Mission cleared!
      this.fx.playMissionClear();
      this.editor.clearErrorHighlights();
      this.editor.setLocked(true);

      const bd = result.scoreBreakdown;
      const parText = bd.underPar ? 'UNDER PAR BONUS!' : 'MISSION CLEARED';
      const bonusTag = bd.bonusPickupPoints > 0 ? ` | +${bd.bonusPickupPoints} BONUS CORE` : '';
      this.dom.clearBanner.textContent =
        `${parText}  +${bd.total} PTS  (Time: ${(result.puzzleElapsedMs / 1000).toFixed(1)}s | Multiplier: x${bd.multiplier.toFixed(2)}${bonusTag})`;
      this.dom.clearBanner.classList.remove('hidden');

      this.dom.terminalStatus.textContent = 'CLEAN';
      this.dom.terminalOutput.innerHTML =
        `<div class="term-success"><strong>OK:</strong> ${escapeHtml(result.verdict.summary)}</div>`;
      this._setDialogue(randomFrom(CLEAR_BARKS), 'CLEAR', 'status-clear');

      if (result.runComplete) {
        this._stopTimer();
        this.state = 'DEBRIEF';
        setTimeout(() => {
          this._showDebrief(result.runSummary);
        }, 700);
      } else {
        this.state = 'TRANSITION';
        setTimeout(() => {
          this.dom.clearBanner.classList.add('hidden');
          if (this.hazardVisionCharges > 0) {
            this.hazardVisionCharges -= 1;
            this._syncHazardVisionUi();
          }
          this.state = 'PLAYING';
          this._loadPuzzle(result.nextPuzzle);
          this._setDialogue('"Next orbital file loaded! Keep your speed up, Marine!"', 'READY', 'status-ready');
        }, 700);
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async requestHint() {
    if (this.state !== 'PLAYING' || !this.activePuzzle) return;
    const hintDto = await this.service.requestHint({
      runId: this.runId,
      puzzleId: this.activePuzzle.id
    });

    this.dom.terminalStatus.textContent = 'SCANNER ACTIVE';
    this.dom.terminalOutput.innerHTML = `
      <div class="term-hint">
        <strong>TACTICAL SCANNER HINT:</strong> ${escapeHtml(hintDto.hint)}
      </div>
    `;
    this._setDialogue('"Tactical Scanner engaged! Read the guidance below and clean that code."', 'SCAN', 'status-ready');
    this.editor.focus();
  }

  handleWhitespaceDestroyed({ char, position, positions }) {
    const isTab = char === '\t';
    const targets = Array.isArray(positions) && positions.length > 0 ? positions : [position];
    targets.forEach((pos, idx) => {
      if (pos) this.fx.fireVaporize({ x: pos.x, y: pos.y, isTab, playSound: idx === 0 });
    });
    this._setDialogue(
      targets.length > 1
        ? '"MULTI-CURSOR PLASMA VOLLEY! Multiple lines purged at once!"'
        : isTab
          ? randomFrom(TAB_BARKS)
          : randomFrom(DESTROY_BARKS),
      targets.length > 1 ? 'VOLLEY' : 'FIRING',
      'status-ready'
    );
  }

  handleWhitespaceAdded({ position, positions }) {
    const targets = Array.isArray(positions) && positions.length > 0 ? positions : [position];
    targets.forEach((pos, idx) => {
      if (pos) this.fx.playDeployIndent({ x: pos.x, y: pos.y, playSound: idx === 0 });
    });
  }

  handleBlockedEdit({ reason }) {
    this.fx.playBlocked();
    this._setDialogue(`"${reason}"`, 'LOCKED', 'status-alert');
  }

  handlePowerupCollected({ position }) {
    this.hazardVisionCharges = 5;
    this._syncHazardVisionUi();
    this.fx.playPowerupCollected(position);
    this._setDialogue(
      '"POWER-UP ACQUIRED! Hazard Vision online for 5 missions — rogue whitespace highlighted!"',
      'POWER-UP',
      'status-clear'
    );
  }

  handleBonusPointsCollected({ position }) {
    this.fx.playBonusPointsCollected(position);
    this._setDialogue(
      '"BONUS CORE COLLECTED! +250 bonus points locked in for this mission!"',
      '+250 PTS',
      'status-clear'
    );
  }

  _syncHazardVisionUi() {
    const active = this.hazardVisionCharges > 0;
    this.editor.setHazardVision(active);
    if (this.dom.hudPowerup) {
      this.dom.hudPowerup.textContent = active ? `VISION x${this.hazardVisionCharges}` : 'OFF';
      this.dom.hudPowerup.closest('.metric-pill')?.classList.toggle('powerup-active', active);
    }
  }

  handleCursorChange({ line, column, leadingSpaces, cursorCount = 1, userMoved = false }) {
    if (this.dom.cursorTelemetry) {
      const multiTag = cursorCount > 1 ? ` | ${cursorCount} CURSORS` : '';
      this.dom.cursorTelemetry.textContent = `LN ${line} | COL ${column} | INDENT ${leadingSpaces}${multiTag}`;
    }
    if (userMoved) {
      this.fx.playCursorTick();
    }
  }

  openSectorSelect() {
    this._stopTimer();
    this.state = 'BRIEFING';
    this.pausedAtMs = null;
    this.totalPausedMs = 0;
    this._syncPauseUi(false);
    this.dom.modalDebrief.classList.add('hidden');
    if (this.dom.gameWorkspace) this.dom.gameWorkspace.classList.add('hidden');
    this.dom.modalStart.classList.remove('hidden');
    this._refreshLeaderboards();
  }

  async _showDebrief(summary) {
    this.dom.debriefRankBadge.textContent = summary.rank.title.toUpperCase();
    this.dom.debriefScore.textContent = summary.totalScore.toLocaleString();
    this.dom.debriefTime.textContent = formatDuration(summary.totalElapsedMs);
    this.dom.debriefCleared.textContent = `${summary.puzzlesCleared} / ${summary.totalPuzzles}`;
    this.dom.debriefStreak.textContent = String(summary.bestStreak);

    this.dom.debriefMastery.innerHTML = summary.conceptMastery
      .map((item) => {
        const badgeCls =
          item.status === 'MASTERED'
            ? 'badge-mastered'
            : item.status === 'PROFICIENT'
              ? 'badge-proficient'
              : 'badge-drill';
        return `
          <div class="mastery-card">
            <div class="mastery-top">
              <span class="mastery-label">${escapeHtml(item.label)}</span>
              <span class="status-badge ${badgeCls}">${escapeHtml(item.status)}</span>
            </div>
            <p class="mastery-desc">${escapeHtml(item.description)}</p>
          </div>
        `;
      })
      .join('');

    await this._refreshLeaderboards();
    this.dom.modalDebrief.classList.remove('hidden');
  }

  async _refreshLeaderboards() {
    const entries = await this.service.getLeaderboard();
    const html = entries.length === 0
      ? '<div class="lb-empty">No completed orbital runs yet. Deploy to claim #1!</div>'
      : entries
          .slice(0, 6)
          .map(
            (e, idx) => {
              const nameHtml = e.formbarId
                ? `<a class="lb-profile-link" href="/profile/${encodeURIComponent(e.formbarId)}">${escapeHtml(e.callsign)}</a>`
                : escapeHtml(e.callsign);
              return `
              <div class="lb-row">
                <span>#${idx + 1}</span>
                <span>${nameHtml} (${escapeHtml(e.rank)})</span>
                <span>${Number(e.score).toLocaleString()} pts</span>
                <span>${formatDuration(e.elapsedMs)}</span>
              </div>
            `;
            }
          )
          .join('');

    if (this.dom.startLeaderboard) this.dom.startLeaderboard.innerHTML = html;
    if (this.dom.debriefLeaderboard) this.dom.debriefLeaderboard.innerHTML = html;
  }

  _renderTerminalIssues(issues) {
    this.dom.terminalStatus.textContent = `${issues.length} ERROR${issues.length === 1 ? '' : 'S'}`;
    this.dom.terminalOutput.innerHTML = issues
      .slice(0, 4)
      .map(
        (issue) => `
          <div class="term-issue">
            <p class="term-error-head">${escapeHtml(issue.pythonMessage)}</p>
            <p class="term-explanation">${escapeHtml(issue.explanation)}</p>
          </div>
        `
      )
      .join('');
  }

  _updateHud({ score, streak, rank }) {
    this.dom.hudScore.textContent = Number(score).toLocaleString();
    const mult = (1 + Math.min(streak, 8) * 0.15).toFixed(2);
    this.dom.hudStreak.textContent = `x${mult}`;
    if (rank) {
      this.dom.hudRank.textContent = rank.badge;
      this.dom.hudRank.title = rank.title;
    }
  }

  _setDialogue(text, badgeText, badgeClass) {
    if (this.dom.marineDialogue) this.dom.marineDialogue.textContent = text;
    if (this.dom.marineStatusBadge) {
      this.dom.marineStatusBadge.textContent = badgeText;
      this.dom.marineStatusBadge.className = `status-badge ${badgeClass}`;
    }
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state === 'PLAYING' || this.state === 'TRANSITION') {
        const elapsed = Math.max(0, Date.now() - this.runStartedAtMs - this.totalPausedMs);
        this.dom.hudTimer.textContent = formatDuration(elapsed);
      }
    }, 100);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
