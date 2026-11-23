const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { loadGameCore } = require('../lib/game-core');
const { requireLogin } = require('../lib/auth-middleware');

const router = express.Router();

const POWERUP_INTERVAL = 5;
const RUN_TTL_MS = 1000 * 60 * 60 * 3; // 3 hours
const activeRuns = new Map();

function pruneExpiredRuns() {
    const cutoff = Date.now() - RUN_TTL_MS;
    for (const [id, run] of activeRuns.entries()) {
        if (run.startedAtMs < cutoff) {
            activeRuns.delete(id);
        }
    }
}

function injectRandomPowerup(code, powerupChar) {
    const lines = String(code ?? '').split('\n');
    if (lines.length === 0) return { code, hasPowerup: false };

    const row = Math.floor(Math.random() * lines.length);
    const line = lines[row];
    const col = Math.floor(Math.random() * (line.length + 1));
    lines[row] = line.slice(0, col) + powerupChar + line.slice(col);

    return {
        code: lines.join('\n'),
        hasPowerup: true
    };
}

function sanitizePuzzleForClient(puzzle, index, total, powerupChar, bonusPointsChar) {
    let brokenCode = puzzle.brokenCode;
    let hasPowerup = false;
    let hasBonusPoints = false;

    // Every mission spawns 1 optional Bonus Points power-up at a random position
    if (bonusPointsChar) {
        const injectedBonus = injectRandomPowerup(brokenCode, bonusPointsChar);
        brokenCode = injectedBonus.code;
        hasBonusPoints = injectedBonus.hasPowerup;
    }

    // Every 5th mission (1, 6, 11, 16, 21, ...) also spawns a Hazard Vision power-up
    if (index % POWERUP_INTERVAL === 0) {
        const injected = injectRandomPowerup(brokenCode, powerupChar);
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

function recordConcept(run, conceptId, passed, conceptMetadata) {
    if (!conceptId) return;
    if (!run.conceptStats[conceptId]) {
        const meta = conceptMetadata[conceptId] || {
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

function buildRunSummary(run, core) {
    const totalElapsedMs = (run.finishedAtMs || Date.now()) - run.startedAtMs;
    const rank = core.getMarineRank(run.score);
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

const getPuzzleProgressStmt = db.prepare(
    'SELECT * FROM puzzle_progress WHERE user_id = ? AND puzzle_id = ?'
);

const insertPuzzleProgressStmt = db.prepare(`
    INSERT INTO puzzle_progress (
        user_id, puzzle_id, best_score, best_time_ms, clears, total_mistakes, min_mistakes, best_accuracy, last_cleared_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, datetime('now'))
`);

const updatePuzzleProgressStmt = db.prepare(`
    UPDATE puzzle_progress
    SET best_score = MAX(best_score, ?),
        best_time_ms = CASE WHEN best_time_ms = 0 OR ? < best_time_ms THEN ? ELSE best_time_ms END,
        clears = clears + 1,
        total_mistakes = total_mistakes + ?,
        min_mistakes = MIN(min_mistakes, ?),
        best_accuracy = MAX(best_accuracy, ?),
        last_cleared_at = datetime('now')
    WHERE user_id = ? AND puzzle_id = ?
`);

const insertRunStmt = db.prepare(`
    INSERT INTO runs (
        id, user_id, scope_key, callsign, total_score, total_elapsed_ms,
        puzzles_cleared, total_puzzles, best_streak, total_mistakes, hints_used,
        rank_title, concept_mastery_json, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const leaderboardStmt = db.prepare(`
    SELECT r.callsign, r.scope_key AS sector, r.total_score AS score,
           r.total_elapsed_ms AS elapsedMs, r.rank_title AS rank,
           r.puzzles_cleared AS puzzlesCleared, r.completed_at AS date,
           u.formbar_id AS formbarId, u.username
    FROM runs r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.total_score DESC, r.total_elapsed_ms ASC
    LIMIT 15
`);

router.get('/catalog', async (req, res, next) => {
    try {
        const core = await loadGameCore();
        const campaigns = core.CAMPAIGNS.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: c.subtitle,
            missionCount: c.puzzles.length
        }));
        const sectors = core.SECTORS.map((s) => ({
            ...s,
            missionCount: core.getPuzzlesForSector(`sector:${s.id}`).length
        }));
        res.json({ campaigns, sectors });
    } catch (err) {
        next(err);
    }
});

router.get('/leaderboard', (req, res) => {
    const entries = leaderboardStmt.all();
    res.json(entries);
});

router.post('/runs', requireLogin, async (req, res, next) => {
    try {
        pruneExpiredRuns();
        const core = await loadGameCore();
        const { callsign, sector = 'campaign:beginner' } = req.body || {};
        const fallbackName = req.currentUser.username || 'CADET-01';
        const cleanCallsign = String(callsign || fallbackName).trim().slice(0, 18) || fallbackName;
        const queue = core.getPuzzlesForSector(sector);

        if (!queue || queue.length === 0) {
            return res.status(400).json({ error: `No puzzles available for sector: ${sector}` });
        }

        const now = Date.now();
        const runId = crypto.randomUUID();
        const runState = {
            runId,
            userId: req.currentUser.id,
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

        activeRuns.set(runId, runState);

        return res.json({
            runId,
            callsign: cleanCallsign,
            sector: runState.sector,
            startedAtMs: now,
            totalPuzzles: queue.length,
            score: 0,
            streak: 0,
            rank: core.getMarineRank(0),
            puzzle: sanitizePuzzleForClient(
                queue[0],
                0,
                queue.length,
                core.POWERUP_CHAR,
                core.BONUS_POINTS_CHAR
            )
        });
    } catch (err) {
        next(err);
    }
});

router.post('/runs/:runId/submit', requireLogin, async (req, res, next) => {
    try {
        const core = await loadGameCore();
        const { runId } = req.params;
        const { puzzleId, code } = req.body || {};

        const run = activeRuns.get(runId);
        if (!run || run.userId !== req.currentUser.id) {
            return res.status(404).json({ error: 'Invalid or expired runId.' });
        }
        if (run.finishedAtMs !== null) {
            return res.status(400).json({ error: 'Run is already completed.' });
        }
        if (run.pausedAtMs !== null) {
            return res.status(400).json({ error: 'Run is paused. Resume before submitting.' });
        }

        const activePuzzle = run.queue[run.currentIndex];
        if (!activePuzzle || activePuzzle.id !== puzzleId) {
            return res.status(400).json({ error: 'Submitted puzzleId does not match the active mission.' });
        }

        const verdict = core.validateSubmission(activePuzzle, code);
        const now = Date.now();

        if (!verdict.valid) {
            run.puzzleMistakes += 1;
            run.totalMistakes += 1;
            run.streak = 0;

            for (const issue of verdict.issues) {
                recordConcept(run, issue.concept, false, core.CONCEPT_METADATA);
            }

            return res.json({
                valid: false,
                verdict,
                score: run.score,
                streak: run.streak,
                rank: core.getMarineRank(run.score),
                runComplete: false
            });
        }

        const puzzleElapsedMs = Math.max(100, now - run.puzzleStartedAtMs);
        const bonusPointsCollected = !String(code ?? '').includes(core.BONUS_POINTS_CHAR);
        const scoreBreakdown = core.calculatePuzzleScore({
            elapsedMs: puzzleElapsedMs,
            parTimeMs: activePuzzle.parTimeMs,
            streak: run.streak,
            mistakes: run.puzzleMistakes,
            usedHint: run.puzzleUsedHint,
            bonusPointsCollected
        });

        // Compute per-puzzle accuracy: 1.0 on clean clear, scaled down by mistakes and optional hint use
        const puzzleAccuracy = Math.max(
            0.1,
            Number(((1 / (1 + run.puzzleMistakes)) * (run.puzzleUsedHint ? 0.9 : 1)).toFixed(4))
        );

        const existingProg = getPuzzleProgressStmt.get(req.currentUser.id, activePuzzle.id);
        if (!existingProg) {
            insertPuzzleProgressStmt.run(
                req.currentUser.id,
                activePuzzle.id,
                scoreBreakdown.total,
                puzzleElapsedMs,
                run.puzzleMistakes,
                run.puzzleMistakes,
                puzzleAccuracy
            );
        } else {
            updatePuzzleProgressStmt.run(
                scoreBreakdown.total,
                puzzleElapsedMs,
                puzzleElapsedMs,
                run.puzzleMistakes,
                run.puzzleMistakes,
                puzzleAccuracy,
                req.currentUser.id,
                activePuzzle.id
            );
        }

        run.score += scoreBreakdown.total;
        run.streak += 1;
        run.bestStreak = Math.max(run.bestStreak, run.streak);
        run.puzzlesCleared += 1;

        for (const concept of activePuzzle.concepts) {
            recordConcept(run, concept, true, core.CONCEPT_METADATA);
        }

        run.currentIndex += 1;
        run.puzzleMistakes = 0;
        run.puzzleUsedHint = false;
        run.puzzleStartedAtMs = now;

        const isComplete = run.currentIndex >= run.queue.length;
        if (isComplete) {
            run.finishedAtMs = now;
            const summary = buildRunSummary(run, core);
            insertRunStmt.run(
                summary.runId,
                req.currentUser.id,
                summary.sector,
                summary.callsign,
                summary.totalScore,
                summary.totalElapsedMs,
                summary.puzzlesCleared,
                summary.totalPuzzles,
                summary.bestStreak,
                summary.totalMistakes,
                summary.hintsUsed,
                summary.rank.title,
                JSON.stringify(summary.conceptMastery)
            );
            activeRuns.delete(runId);

            return res.json({
                valid: true,
                verdict,
                scoreBreakdown,
                puzzleElapsedMs,
                score: run.score,
                streak: run.streak,
                rank: core.getMarineRank(run.score),
                runComplete: true,
                nextPuzzle: null,
                runSummary: summary
            });
        }

        const nextPuzzle = sanitizePuzzleForClient(
            run.queue[run.currentIndex],
            run.currentIndex,
            run.queue.length,
            core.POWERUP_CHAR,
            core.BONUS_POINTS_CHAR
        );

        return res.json({
            valid: true,
            verdict,
            scoreBreakdown,
            puzzleElapsedMs,
            score: run.score,
            streak: run.streak,
            rank: core.getMarineRank(run.score),
            runComplete: false,
            nextPuzzle
        });
    } catch (err) {
        next(err);
    }
});

router.post('/runs/:runId/hint', requireLogin, async (req, res, next) => {
    try {
        const core = await loadGameCore();
        const { runId } = req.params;
        const { puzzleId } = req.body || {};

        const run = activeRuns.get(runId);
        if (!run || run.userId !== req.currentUser.id) {
            return res.status(404).json({ error: 'Invalid or expired runId.' });
        }

        const activePuzzle = run.queue[run.currentIndex];
        if (!activePuzzle || activePuzzle.id !== puzzleId) {
            return res.status(400).json({ error: 'Requested hint does not match the active mission.' });
        }

        if (!run.puzzleUsedHint) {
            run.puzzleUsedHint = true;
            run.hintsUsed += 1;
        }

        return res.json({
            puzzleId: activePuzzle.id,
            hint: activePuzzle.hint,
            concepts: activePuzzle.concepts.map(
                (c) => core.CONCEPT_METADATA[c] || { id: c, label: c, description: '' }
            )
        });
    } catch (err) {
        next(err);
    }
});

router.post('/runs/:runId/pause', requireLogin, (req, res) => {
    const run = activeRuns.get(req.params.runId);
    if (!run || run.userId !== req.currentUser.id) {
        return res.status(404).json({ error: 'Invalid or expired runId.' });
    }
    if (run.finishedAtMs !== null) {
        return res.status(400).json({ error: 'Run is already completed.' });
    }
    if (run.pausedAtMs === null) {
        run.pausedAtMs = Date.now();
    }
    return res.json({ paused: true, pausedAtMs: run.pausedAtMs });
});

router.post('/runs/:runId/resume', requireLogin, (req, res) => {
    const run = activeRuns.get(req.params.runId);
    if (!run || run.userId !== req.currentUser.id) {
        return res.status(404).json({ error: 'Invalid or expired runId.' });
    }
    if (run.finishedAtMs !== null) {
        return res.status(400).json({ error: 'Run is already completed.' });
    }
    if (run.pausedAtMs !== null) {
        const pausedDuration = Math.max(0, Date.now() - run.pausedAtMs);
        run.startedAtMs += pausedDuration;
        run.puzzleStartedAtMs += pausedDuration;
        run.pausedAtMs = null;
    }
    return res.json({ paused: false, startedAtMs: run.startedAtMs });
});

module.exports = router;
