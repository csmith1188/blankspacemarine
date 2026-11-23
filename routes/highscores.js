const express = require('express');
const db = require('../lib/db');
const { loadGameCore, getScopeCatalog } = require('../lib/game-core');

const router = express.Router();

function formatDuration(ms) {
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const totalTenths = Math.floor(safe / 100);
    const tenths = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function getScopeSqlFilter(scopeKey) {
    if (!scopeKey || scopeKey === 'all') {
        return { clause: '', params: [] };
    }
    if (scopeKey === 'campaign:main') {
        return { clause: "WHERE r.scope_key IN ('campaign:main', 'all', 'main')", params: [] };
    }
    return { clause: 'WHERE r.scope_key = ?', params: [scopeKey] };
}

router.get('/highscores', async (req, res, next) => {
    try {
        const core = await loadGameCore();
        const scopes = getScopeCatalog(core);
        const scopeLabelByKey = new Map(scopes.map((s) => [s.key, s.label]));
        scopeLabelByKey.set('all', 'Main Campaign: Orbital Purge');
        scopeLabelByKey.set('main', 'Main Campaign: Orbital Purge');

        const requestedScope = String(req.query.scope || 'all');
        const validScopeKeys = new Set(['all', ...scopes.map((s) => s.key)]);
        const selectedScope = validScopeKeys.has(requestedScope) ? requestedScope : 'all';

        const viewMode = req.query.view === 'runs' ? 'runs' : 'best';
        const { clause, params } = getScopeSqlFilter(selectedScope);

        // Summary telemetry for the selected scope
        const summaryStmt = db.prepare(`
            SELECT
                COUNT(*) AS total_runs,
                COUNT(DISTINCT r.user_id) AS unique_players,
                MAX(r.total_score) AS top_score,
                MIN(r.total_elapsed_ms) AS fastest_ms
            FROM runs r
            ${clause}
        `);
        const summary = summaryStmt.get(...params) || {};

        let rows = [];
        if (viewMode === 'best') {
            // Best single run per Marine in the selected scope
            const bestPerUserStmt = db.prepare(`
                SELECT
                    ranked.id,
                    ranked.callsign,
                    ranked.scope_key,
                    ranked.total_score,
                    ranked.total_elapsed_ms,
                    ranked.puzzles_cleared,
                    ranked.total_puzzles,
                    ranked.best_streak,
                    ranked.total_mistakes,
                    ranked.rank_title,
                    ranked.completed_at,
                    ranked.formbar_id,
                    ranked.username
                FROM (
                    SELECT
                        r.*,
                        u.formbar_id,
                        u.username,
                        ROW_NUMBER() OVER (
                            PARTITION BY r.user_id
                            ORDER BY r.total_score DESC, r.total_elapsed_ms ASC, r.completed_at ASC
                        ) AS rn
                    FROM runs r
                    JOIN users u ON u.id = r.user_id
                    ${clause}
                ) AS ranked
                WHERE ranked.rn = 1
                ORDER BY ranked.total_score DESC, ranked.total_elapsed_ms ASC, ranked.completed_at ASC
                LIMIT 50
            `);
            rows = bestPerUserStmt.all(...params);
        } else {
            const allRunsStmt = db.prepare(`
                SELECT
                    r.id,
                    r.callsign,
                    r.scope_key,
                    r.total_score,
                    r.total_elapsed_ms,
                    r.puzzles_cleared,
                    r.total_puzzles,
                    r.best_streak,
                    r.total_mistakes,
                    r.rank_title,
                    r.completed_at,
                    u.formbar_id,
                    u.username
                FROM runs r
                JOIN users u ON u.id = r.user_id
                ${clause}
                ORDER BY r.total_score DESC, r.total_elapsed_ms ASC, r.completed_at ASC
                LIMIT 50
            `);
            rows = allRunsStmt.all(...params);
        }

        const entries = rows.map((row, idx) => ({
            position: idx + 1,
            callsign: row.callsign,
            username: row.username,
            formbarId: row.formbar_id,
            scopeKey: row.scope_key,
            scopeLabel: scopeLabelByKey.get(row.scope_key) || row.scope_key,
            score: Number(row.total_score || 0),
            durationText: formatDuration(row.total_elapsed_ms),
            puzzlesCleared: row.puzzles_cleared,
            totalPuzzles: row.total_puzzles,
            bestStreak: row.best_streak,
            mistakes: row.total_mistakes,
            rankTitle: row.rank_title,
            completedAt: row.completed_at,
            isCurrentUser: Boolean(req.currentUser && req.currentUser.formbarId === row.formbar_id)
        }));

        const podium = entries.slice(0, 3);

        res.locals.activeNav = 'highscores';
        return res.render('highscores', {
            scopes,
            selectedScope,
            selectedScopeLabel:
                selectedScope === 'all'
                    ? 'All Campaigns'
                    : scopeLabelByKey.get(selectedScope) || selectedScope,
            viewMode,
            summary: {
                totalRuns: Number(summary.total_runs || 0),
                uniquePlayers: Number(summary.unique_players || 0),
                topScore: Number(summary.top_score || 0),
                fastestText: summary.fastest_ms ? formatDuration(summary.fastest_ms) : '--:--.-'
            },
            podium,
            entries
        });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
