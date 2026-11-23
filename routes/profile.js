const express = require('express');
const db = require('../lib/db');
const {
    loadGameCore,
    getScopeCatalog,
    resolvePuzzlesForScopes,
    calculateStudentScopeMetrics
} = require('../lib/game-core');

const router = express.Router();

const getUserByFormbarIdStmt = db.prepare(
    'SELECT id, formbar_id, username, permissions, schoology_id, schoology_name, created_at FROM users WHERE formbar_id = ?'
);
const getProgressForUserStmt = db.prepare(
    'SELECT * FROM puzzle_progress WHERE user_id = ?'
);
const getRunsForUserStmt = db.prepare(
    'SELECT * FROM runs WHERE user_id = ? ORDER BY completed_at DESC LIMIT 20'
);
const getSummaryForUserStmt = db.prepare(`
    SELECT
        COUNT(*) AS total_runs,
        COALESCE(MAX(total_score), 0) AS best_run_score,
        COALESCE(SUM(total_score), 0) AS lifetime_score,
        COALESCE(MAX(best_streak), 0) AS best_streak,
        COALESCE(SUM(puzzles_cleared), 0) AS total_clears
    FROM runs
    WHERE user_id = ?
`);

function formatDuration(ms) {
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const totalTenths = Math.floor(safe / 100);
    const tenths = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

router.get('/profile', (req, res) => {
    if (!req.currentUser) {
        return res.redirect('/login?returnTo=/profile');
    }
    return res.redirect(`/profile/${encodeURIComponent(req.currentUser.formbarId)}`);
});

router.get('/profile/:formbarId', async (req, res, next) => {
    try {
        const formbarId = String(req.params.formbarId || '').trim();
        const profileUser = getUserByFormbarIdStmt.get(formbarId);

        if (!profileUser) {
            return res.status(404).render('error', {
                title: 'Marine Profile Not Found',
                message: `No Blank Space Marine profile exists yet for Formbar ID "${formbarId}".`
            });
        }

        const core = await loadGameCore();
        const scopes = getScopeCatalog(core);
        const progressRows = getProgressForUserStmt.all(profileUser.id);
        const progressMap = new Map(progressRows.map((row) => [row.puzzle_id, row]));
        const runs = getRunsForUserStmt.all(profileUser.id);
        const runStats = getSummaryForUserStmt.get(profileUser.id);

        const scopeStats = scopes.map((scope) => {
            const puzzles = resolvePuzzlesForScopes(core, [scope.key]);
            const metrics = calculateStudentScopeMetrics(puzzles, progressMap, 100);
            const bestRun = runs
                .filter((r) => r.scope_key === scope.key)
                .reduce((best, r) => (best == null || r.total_score > best.total_score ? r : best), null);
            return {
                ...scope,
                ...metrics,
                bestRunScore: bestRun ? bestRun.total_score : 0,
                bestRunTime: bestRun ? formatDuration(bestRun.total_elapsed_ms) : '—'
            };
        });

        // Aggregate concept mastery across completed runs
        const conceptAgg = new Map();
        for (const run of runs) {
            let items = [];
            try {
                items = JSON.parse(run.concept_mastery_json || '[]');
            } catch {
                items = [];
            }
            for (const item of items) {
                if (!item || !item.id) continue;
                const prev = conceptAgg.get(item.id) || {
                    id: item.id,
                    label: (core.CONCEPT_METADATA[item.id] && core.CONCEPT_METADATA[item.id].label) || item.label || item.id,
                    description: (core.CONCEPT_METADATA[item.id] && core.CONCEPT_METADATA[item.id].description) || item.description || '',
                    cleared: 0,
                    tripped: 0
                };
                prev.cleared += Number(item.cleared) || 0;
                prev.tripped += Number(item.tripped) || 0;
                conceptAgg.set(item.id, prev);
            }
        }

        const conceptMastery = Array.from(conceptAgg.values()).map((c) => {
            const total = c.cleared + c.tripped;
            const accuracy = total > 0 ? Math.round((c.cleared / total) * 100) : 100;
            const status = c.tripped === 0 ? 'MASTERED' : accuracy >= 70 ? 'PROFICIENT' : 'NEEDS DRILL';
            return { ...c, accuracy, status };
        });

        const rank = core.getMarineRank(runStats.best_run_score || 0);
        const isOwnProfile = !!(req.currentUser && String(req.currentUser.formbarId) === String(profileUser.formbar_id));

        const formattedRuns = runs.map((r) => {
            const matchedScope = scopes.find((s) => s.key === r.scope_key);
            return {
                ...r,
                scopeLabel: matchedScope ? matchedScope.label : r.scope_key,
                durationText: formatDuration(r.total_elapsed_ms)
            };
        });

        res.locals.activeNav = isOwnProfile ? 'profile' : '';
        return res.render('profile', {
            profileUser,
            isOwnProfile,
            rank,
            runStats,
            uniquePuzzlesCleared: progressRows.filter((p) => p.clears > 0).length,
            totalCatalogPuzzles: resolvePuzzlesForScopes(core, scopes.map((s) => s.key)).length,
            scopeStats,
            conceptMastery,
            recentRuns: formattedRuns,
            schoologyLinked: req.query.schoologyLinked === '1',
            schoologyUnlinked: req.query.schoologyUnlinked === '1',
            schoologyError: req.query.schoologyError || null
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
