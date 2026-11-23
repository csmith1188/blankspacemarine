const path = require('path');
const { pathToFileURL } = require('url');

let cachedCorePromise = null;

/**
 * Loads the pure-ESM game core modules once and caches them for CommonJS routes.
 */
function loadGameCore() {
    if (!cachedCorePromise) {
        const coreDir = path.join(__dirname, '..', 'core');
        cachedCorePromise = Promise.all([
            import(pathToFileURL(path.join(coreDir, 'puzzles.js')).href),
            import(pathToFileURL(path.join(coreDir, 'validator.js')).href),
            import(pathToFileURL(path.join(coreDir, 'scoring.js')).href)
        ]).then(([puzzlesMod, validatorMod, scoringMod]) => ({
            ...puzzlesMod,
            ...validatorMod,
            ...scoringMod
        }));
    }
    return cachedCorePromise;
}

/**
 * Builds the canonical list of selectable campaign scopes for checklists & analytics.
 */
function getScopeCatalog(core) {
    const scopes = [];
    for (const c of core.CAMPAIGNS) {
        scopes.push({
            key: `campaign:${c.id}`,
            kind: 'campaign',
            id: c.id,
            label: c.name,
            subtitle: c.subtitle,
            puzzleIds: c.puzzles.map((p) => p.id)
        });
    }
    return scopes;
}

/**
 * Given an array of scope keys (e.g. ["campaign:beginner", "campaign:main"]), returns
 * the deduplicated list of puzzle objects and their IDs.
 */
function resolvePuzzlesForScopes(core, scopeKeys) {
    const keys = Array.isArray(scopeKeys) ? scopeKeys : [];
    const seen = new Set();
    const puzzles = [];
    for (const key of keys) {
        const list = core.getPuzzlesForSector(key);
        for (const p of list) {
            if (!seen.has(p.id)) {
                seen.add(p.id);
                puzzles.push(p);
            }
        }
    }
    return puzzles;
}

/**
 * Calculates a student's completion, accuracy, and scaled Schoology grade
 * over a selected set of puzzles using rows from `puzzle_progress`.
 *
 * Formula:
 *   completion = uniqueCleared / totalPuzzles
 *   accuracy   = average(best_accuracy) over cleared puzzles (0 if none cleared)
 *   grade      = round(completion * accuracy * maxScore * 100) / 100
 */
function calculateStudentScopeMetrics(selectedPuzzles, progressByPuzzleId, maxScore = 100) {
    const totalPuzzles = selectedPuzzles.length;
    const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;

    if (totalPuzzles === 0) {
        return {
            totalPuzzles: 0,
            clearedPuzzles: 0,
            completionPct: 0,
            accuracyPct: 0,
            grade: 0,
            maxScore: safeMax,
            totalBestPoints: 0,
            missingPuzzles: [],
            weakConcepts: []
        };
    }

    let clearedPuzzles = 0;
    let accuracySum = 0;
    let totalBestPoints = 0;
    const missingPuzzles = [];
    const conceptMistakes = new Map();

    for (const puzzle of selectedPuzzles) {
        const prog = progressByPuzzleId.get(puzzle.id);
        if (prog && prog.clears > 0) {
            clearedPuzzles += 1;
            const acc = Math.max(0, Math.min(1, Number(prog.best_accuracy) || 0));
            accuracySum += acc;
            totalBestPoints += Number(prog.best_score) || 0;
            if (prog.min_mistakes > 0) {
                for (const c of puzzle.concepts || []) {
                    conceptMistakes.set(c, (conceptMistakes.get(c) || 0) + prog.min_mistakes);
                }
            }
        } else {
            missingPuzzles.push({
                id: puzzle.id,
                title: puzzle.title,
                sectorName: puzzle.sectorName
            });
            for (const c of puzzle.concepts || []) {
                conceptMistakes.set(c, (conceptMistakes.get(c) || 0) + 1);
            }
        }
    }

    const completion = clearedPuzzles / totalPuzzles;
    const accuracy = clearedPuzzles > 0 ? accuracySum / clearedPuzzles : 0;
    const grade = Math.round(completion * accuracy * safeMax * 100) / 100;

    const weakConcepts = Array.from(conceptMistakes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([conceptId]) => conceptId);

    return {
        totalPuzzles,
        clearedPuzzles,
        completionPct: Math.round(completion * 100),
        accuracyPct: Math.round(accuracy * 100),
        grade,
        maxScore: safeMax,
        totalBestPoints,
        missingPuzzles,
        weakConcepts
    };
}

module.exports = {
    loadGameCore,
    getScopeCatalog,
    resolvePuzzlesForScopes,
    calculateStudentScopeMetrics
};
