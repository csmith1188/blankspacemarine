import { GameService } from './gameService.js';
import {
  CAMPAIGNS,
  CONCEPT_METADATA,
  SECTORS,
  getPuzzlesForSector
} from '../../core/puzzles.js';
import { validateSubmission, POWERUP_CHAR, BONUS_POINTS_CHAR } from '../../core/validator.js';
import { calculatePuzzleScore, getMarineRank } from '../../core/scoring.js';

const LEADERBOARD_KEY = 'bsm_leaderboard_v1';
const MAX_LEADERBOARD_ENTRIES = 10;
const POWERUP_INTERVAL = 5;

function injectRandomPowerup(code, char = POWERUP_CHAR) {
  const lines = String(code ?? '').split('\n');
  if (lines.length === 0) return { code, hasPowerup: false };

  const row = Math.floor(Math.random() * lines.length);
  const line = lines[row];
  const col = Math.floor(Math.random() * (line.length + 1));
  lines[row] = line.slice(0, col) + char + line.slice(col);

  return {
    code: lines.join('\n'),
    hasPowerup: true
  };
}

function generateRunId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Strips authoritative-only fields (like `solution`) before returning a puzzle DTO to the client.
 */
function sanitizePuzzleForClient(puzzle, index, total) {
  let brokenCode = puzzle.brokenCode;
  let hasPowerup = false;
  let hasBonusPoints = false;

  // Every mission spawns 1 optional Bonus Points power-up at a random position
  const injectedBonus = injectRandomPowerup(brokenCode, BONUS_POINTS_CHAR);
  brokenCode = injectedBonus.code;
  hasBonusPoints = injectedBonus.hasPowerup;

  // Spawn Hazard Vision on every 5th mission starting at mission 1 (1, 6, 11, 16, 21, ...)
  if (index % POWERUP_INTERVAL === 0) {
    const injected = injectRandomPowerup(brokenCode, POWERUP_CHAR);
    brokenCode = injected.code;
    hasPowerup = injected.hasPowerup;
  }

  return {
    id: puzzle.id,
    language: puzzle.language || 'python',
    index,
    total,
    sector: puzzle.sector,
    sectorName: puzzle.sectorName,
    title: puzzle.title,
    briefing: puzzle.briefing,
    parTimeMs: puzzle.parTimeMs,
    concepts: puzzle.concepts.slice(),
    brokenCode,
    hasPowerup,
    hasBonusPoints
  };
}

/**
 * Local in-browser implementation of GameService.
 * Owns authoritative run state, timing, validation, scoring, and concept mastery tracking.
 */
export class LocalAuthority extends GameService {
  constructor({ allowSaveLeaderboard = true, leaderboardUrl = null } = {}) {
    super();
    this.runs = new Map();
    this.allowSaveLeaderboard = allowSaveLeaderboard;
    this.leaderboardUrl = leaderboardUrl;
  }

  async getCampaigns() {
    return CAMPAIGNS.map((c) => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle,
      missionCount: c.puzzles.length
    }));
  }

  async getSectors() {
    return SECTORS.map((s) => ({
      ...s,
      missionCount: getPuzzlesForSector(s.id).length
    }));
  }

  async startRun({ callsign = 'CADET-01', sector = 'all' } = {}) {
    const cleanCallsign = String(callsign || 'CADET-01').trim().slice(0, 18) || 'CADET-01';
    const queue = getPuzzlesForSector(sector);
    if (queue.length === 0) {
      throw new Error(`No puzzles available for sector: ${sector}`);
    }

    const now = Date.now();
    const runId = generateRunId();

    const runState = {
      runId,
      callsign: cleanCallsign,
      sector: String(sector),
      queue,
      currentIndex: 0,
      startedAtMs: now,
      puzzleStartedAtMs: now,
      pausedAtMs: null,
      finishedAtMs: null,
      score: 0,
      streak: 0,
      bestStreak: 0,
      totalMistakes: 0,
      puzzleMistakes: 0,
      puzzleUsedHint: false,
      hintsUsed: 0,
      puzzlesCleared: 0,
      conceptStats: {}
    };

    this.runs.set(runId, runState);

    return {
      runId,
      callsign: cleanCallsign,
      sector: runState.sector,
      startedAtMs: now,
      totalPuzzles: queue.length,
      score: 0,
      streak: 0,
      rank: getMarineRank(0),
      puzzle: sanitizePuzzleForClient(queue[0], 0, queue.length)
    };
  }

  async submitAttempt({ runId, puzzleId, code }) {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error('Invalid or expired runId.');
    }
    if (run.finishedAtMs !== null) {
      throw new Error('Run is already completed.');
    }
    if (run.pausedAtMs !== null) {
      throw new Error('Run is paused. Resume before submitting.');
    }

    const activePuzzle = run.queue[run.currentIndex];
    if (!activePuzzle || activePuzzle.id !== puzzleId) {
      throw new Error('Submitted puzzleId does not match the active mission.');
    }

    const verdict = validateSubmission(activePuzzle, code);
    const now = Date.now();

    if (!verdict.valid) {
      run.puzzleMistakes += 1;
      run.totalMistakes += 1;
      run.streak = 0;

      // Record which concepts tripped the player for the educational debrief
      for (const issue of verdict.issues) {
        this._recordConcept(run, issue.concept, false);
      }

      return {
        valid: false,
        verdict,
        score: run.score,
        streak: run.streak,
        rank: getMarineRank(run.score),
        runComplete: false
      };
    }

    // Valid solution!
    const puzzleElapsedMs = now - run.puzzleStartedAtMs;
    const bonusPointsCollected = !String(code ?? '').includes(BONUS_POINTS_CHAR);
    const scoreBreakdown = calculatePuzzleScore({
      elapsedMs: puzzleElapsedMs,
      parTimeMs: activePuzzle.parTimeMs,
      streak: run.streak,
      mistakes: run.puzzleMistakes,
      usedHint: run.puzzleUsedHint,
      bonusPointsCollected
    });

    run.score += scoreBreakdown.total;
    run.streak += 1;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    run.puzzlesCleared += 1;

    for (const concept of activePuzzle.concepts) {
      this._recordConcept(run, concept, true);
    }

    run.currentIndex += 1;
    run.puzzleMistakes = 0;
    run.puzzleUsedHint = false;
    run.puzzleStartedAtMs = now;

    const isComplete = run.currentIndex >= run.queue.length;
    if (isComplete) {
      run.finishedAtMs = now;
      const summary = this._buildRunSummary(run);
      this._saveLeaderboardEntry(summary);
      return {
        valid: true,
        verdict,
        scoreBreakdown,
        puzzleElapsedMs,
        score: run.score,
        streak: run.streak,
        rank: getMarineRank(run.score),
        runComplete: true,
        nextPuzzle: null,
        runSummary: summary
      };
    }

    const nextPuzzle = sanitizePuzzleForClient(
      run.queue[run.currentIndex],
      run.currentIndex,
      run.queue.length
    );

    return {
      valid: true,
      verdict,
      scoreBreakdown,
      puzzleElapsedMs,
      score: run.score,
      streak: run.streak,
      rank: getMarineRank(run.score),
      runComplete: false,
      nextPuzzle
    };
  }

  async requestHint({ runId, puzzleId }) {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error('Invalid or expired runId.');
    }

    const activePuzzle = run.queue[run.currentIndex];
    if (!activePuzzle || activePuzzle.id !== puzzleId) {
      throw new Error('Requested hint does not match the active mission.');
    }

    if (!run.puzzleUsedHint) {
      run.puzzleUsedHint = true;
      run.hintsUsed += 1;
    }

    return {
      puzzleId: activePuzzle.id,
      hint: activePuzzle.hint,
      concepts: activePuzzle.concepts.map((c) => CONCEPT_METADATA[c] || { id: c, label: c, description: '' })
    };
  }

  async pauseRun({ runId }) {
    const run = this.runs.get(runId);
    if (!run || run.finishedAtMs !== null) {
      return { paused: false };
    }
    if (run.pausedAtMs === null) {
      run.pausedAtMs = Date.now();
    }
    return { paused: true, pausedAtMs: run.pausedAtMs };
  }

  async resumeRun({ runId }) {
    const run = this.runs.get(runId);
    if (!run || run.finishedAtMs !== null) {
      return { paused: false };
    }
    if (run.pausedAtMs !== null) {
      const pausedDuration = Math.max(0, Date.now() - run.pausedAtMs);
      run.startedAtMs += pausedDuration;
      run.puzzleStartedAtMs += pausedDuration;
      run.pausedAtMs = null;
    }
    return { paused: false, startedAtMs: run.startedAtMs };
  }

  async getLeaderboard() {
    if (this.leaderboardUrl) {
      try {
        const res = await fetch(this.leaderboardUrl, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          const parsed = await res.json();
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        // Fall back to empty list for guests if server leaderboard is unreachable
      }
      return [];
    }
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _recordConcept(run, conceptId, passed) {
    if (!conceptId) return;
    if (!run.conceptStats[conceptId]) {
      const meta = CONCEPT_METADATA[conceptId] || {
        id: conceptId,
        label: conceptId,
        description: ''
      };
      run.conceptStats[conceptId] = {
        id: meta.id,
        label: meta.label,
        description: meta.description,
        cleared: 0,
        tripped: 0
      };
    }
    if (passed) {
      run.conceptStats[conceptId].cleared += 1;
    } else {
      run.conceptStats[conceptId].tripped += 1;
    }
  }

  _buildRunSummary(run) {
    const totalElapsedMs = (run.finishedAtMs || Date.now()) - run.startedAtMs;
    const rank = getMarineRank(run.score);
    const conceptMastery = Object.values(run.conceptStats).map((stat) => {
      const totalEvents = stat.cleared + stat.tripped;
      const accuracy = totalEvents > 0 ? Math.round((stat.cleared / totalEvents) * 100) : 100;
      return {
        ...stat,
        accuracy,
        status: stat.tripped === 0 ? 'MASTERED' : accuracy >= 60 ? 'PROFICIENT' : 'NEEDS DRILL'
      };
    });

    return {
      runId: run.runId,
      callsign: run.callsign,
      sector: run.sector,
      totalScore: run.score,
      totalElapsedMs,
      puzzlesCleared: run.puzzlesCleared,
      totalPuzzles: run.queue.length,
      bestStreak: run.bestStreak,
      totalMistakes: run.totalMistakes,
      hintsUsed: run.hintsUsed,
      rank,
      conceptMastery,
      completedAt: new Date().toISOString()
    };
  }

  _saveLeaderboardEntry(summary) {
    if (!this.allowSaveLeaderboard) {
      return;
    }
    try {
      const existing = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
      const entries = Array.isArray(existing) ? existing : [];
      entries.push({
        callsign: summary.callsign,
        sector: summary.sector,
        score: summary.totalScore,
        elapsedMs: summary.totalElapsedMs,
        rank: summary.rank.title,
        puzzlesCleared: summary.puzzlesCleared,
        date: summary.completedAt
      });
      entries.sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs);
      localStorage.setItem(
        LEADERBOARD_KEY,
        JSON.stringify(entries.slice(0, MAX_LEADERBOARD_ENTRIES))
      );
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }
}
