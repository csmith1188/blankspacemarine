import { LocalAuthority } from './services/localAuthority.js';
import { RemoteServerAuthority } from './services/remoteAuthority.js';
import { WhitespaceEditor } from './editor/whitespaceEditor.js';
import { SpaceMarineFx } from './fx/spaceMarineFx.js';
import { GameController } from './gameController.js';

function boot() {
  const dom = {
    fxCanvas: document.getElementById('fx-canvas'),
    marineAvatar: document.getElementById('marine-avatar'),
    startMarinePreview: document.getElementById('start-marine-preview'),
    marineDialogue: document.getElementById('marine-dialogue'),
    marineStatusBadge: document.getElementById('marine-status-badge'),

    hudMission: document.getElementById('hud-mission'),
    hudTimer: document.getElementById('hud-timer'),
    hudScore: document.getElementById('hud-score'),
    hudStreak: document.getElementById('hud-streak'),
    hudRank: document.getElementById('hud-rank'),
    hudPowerup: document.getElementById('hud-powerup'),
    btnPause: document.getElementById('btn-pause'),
    btnResume: document.getElementById('btn-resume'),
    pauseOverlay: document.getElementById('pause-overlay'),
    btnMute: document.getElementById('btn-mute'),

    missionSector: document.getElementById('mission-sector'),
    missionPar: document.getElementById('mission-par'),
    missionTitle: document.getElementById('mission-title'),
    missionBriefing: document.getElementById('mission-briefing'),
    missionConcepts: document.getElementById('mission-concepts'),

    editorEl: document.getElementById('code-editor'),
    cursorTelemetry: document.getElementById('cursor-telemetry'),
    clearBanner: document.getElementById('clear-banner'),
    btnHint: document.getElementById('btn-hint'),
    btnReset: document.getElementById('btn-reset'),
    btnSubmit: document.getElementById('btn-submit'),

    terminalStatus: document.getElementById('terminal-status'),
    terminalOutput: document.getElementById('terminal-output'),

    modalStart: document.getElementById('modal-start'),
    gameWorkspace: document.getElementById('game-workspace'),
    inputCallsign: document.getElementById('input-callsign'),
    selectSector: document.getElementById('select-sector'),
    btnDeploy: document.getElementById('btn-deploy'),
    startLeaderboard: document.getElementById('start-leaderboard'),

    modalDebrief: document.getElementById('modal-debrief'),
    debriefRankBadge: document.getElementById('debrief-rank-badge'),
    debriefScore: document.getElementById('debrief-score'),
    debriefTime: document.getElementById('debrief-time'),
    debriefCleared: document.getElementById('debrief-cleared'),
    debriefStreak: document.getElementById('debrief-streak'),
    debriefMastery: document.getElementById('debrief-mastery'),
    debriefLeaderboard: document.getElementById('debrief-leaderboard'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnChangeSector: document.getElementById('btn-change-sector')
  };

  const currentUser = window.__BSM_USER__ || null;
  if (currentUser && dom.inputCallsign) {
    dom.inputCallsign.value = String(currentUser.username || 'CADET-01').slice(0, 18);
  }

  // Logged-in Formbar users run against the authoritative Express server;
  // guests play locally with score saving disabled.
  const service = currentUser
    ? new RemoteServerAuthority('/api/game')
    : new LocalAuthority({
        allowSaveLeaderboard: false,
        leaderboardUrl: '/api/game/leaderboard'
      });
  const fx = new SpaceMarineFx(dom.fxCanvas, dom.marineAvatar);

  let controller = null;

  const editor = new WhitespaceEditor(dom.editorEl, {
    onWhitespaceDestroyed: (info) => controller?.handleWhitespaceDestroyed(info),
    onWhitespaceAdded: (info) => controller?.handleWhitespaceAdded(info),
    onPowerupCollected: (info) => controller?.handlePowerupCollected(info),
    onBonusPointsCollected: (info) => controller?.handleBonusPointsCollected(info),
    onBlockedEdit: (info) => controller?.handleBlockedEdit(info),
    onCursorChange: (info) => controller?.handleCursorChange(info),
    onSubmit: () => controller?.submitCurrentPuzzle(),
    onHint: () => controller?.requestHint()
  });

  controller = new GameController({ service, editor, fx, dom });

  // Wire UI buttons
  dom.btnDeploy.addEventListener('click', () => controller.startRun());
  dom.btnSubmit.addEventListener('click', () => controller.submitCurrentPuzzle());
  dom.btnHint.addEventListener('click', () => controller.requestHint());
  dom.btnReset.addEventListener('click', () => controller.resetCurrentPuzzle());
  dom.btnPause?.addEventListener('click', () => controller.togglePause());
  dom.btnResume?.addEventListener('click', () => controller.resumeGame());
  dom.btnPlayAgain.addEventListener('click', () => controller.startRun(controller.lastRunOptions));
  dom.btnChangeSector.addEventListener('click', () => controller.openSectorSelect());

  // Mute toggle
  let isMuted = false;
  dom.btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    fx.setMuted(isMuted);
    dom.btnMute.textContent = isMuted ? 'SFX: OFF' : 'SFX: ON';
    dom.btnMute.setAttribute('aria-pressed', String(isMuted));
  });

  // Allow Enter inside callsign input to deploy immediately
  dom.inputCallsign.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      controller.startRun();
    }
  });

  controller.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
