const express = require('express');
const db = require('../lib/db');
const { requireLogin, requireTeacher, requireClassTeacher } = require('../lib/auth-middleware');
const { syncClassesForUser } = require('../lib/formbar-classes');
const {
    loadGameCore,
    getScopeCatalog,
    resolvePuzzlesForScopes,
    calculateStudentScopeMetrics
} = require('../lib/game-core');
const { createClient } = require('../lib/schoology-client');
const schoologyOps = require('../lib/schoology-ops');

const router = express.Router();

const getTeacherClassesStmt = db.prepare(`
    SELECT c.id, c.formbar_class_id, c.name,
           (SELECT COUNT(*) FROM class_members cm2 WHERE cm2.class_id = c.id AND cm2.role = 'student') AS student_count,
           css.schoology_section_id, css.schoology_assignment_id, css.max_score
    FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    LEFT JOIN class_schoology_settings css ON css.class_id = c.id
    WHERE cm.user_id = ? AND cm.role = 'teacher'
    ORDER BY c.name COLLATE NOCASE
`);

const getClassStmt = db.prepare('SELECT id, formbar_class_id, name FROM classes WHERE id = ?');

const getClassStudentsStmt = db.prepare(`
    SELECT u.id, u.formbar_id, u.username, u.schoology_id, u.schoology_name,
           (SELECT COUNT(*) FROM runs r WHERE r.user_id = u.id) AS total_runs,
           (SELECT COALESCE(MAX(r.total_score), 0) FROM runs r WHERE r.user_id = u.id) AS best_run_score
    FROM class_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.class_id = ? AND cm.role = 'student'
    ORDER BY u.username COLLATE NOCASE
`);

const getClassSchoologyStmt = db.prepare(
    'SELECT * FROM class_schoology_settings WHERE class_id = ?'
);

const upsertClassSchoologyStmt = db.prepare(`
    INSERT INTO class_schoology_settings (
        class_id, schoology_section_id, schoology_assignment_id, max_score, selected_scopes_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(class_id) DO UPDATE SET
        schoology_section_id = excluded.schoology_section_id,
        schoology_assignment_id = excluded.schoology_assignment_id,
        max_score = excluded.max_score,
        selected_scopes_json = excluded.selected_scopes_json,
        updated_at = datetime('now')
`);

const updateStudentSchoologyIdStmt = db.prepare(`
    UPDATE users
    SET schoology_id = ?, updated_at = datetime('now')
    WHERE id = ?
`);

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseSelectedScopes(rawJson, fallbackScopes) {
    if (!rawJson) return fallbackScopes;
    try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(String);
        }
    } catch {
        // Ignore malformed JSON
    }
    return fallbackScopes;
}

function loadProgressMapForUsers(userIds) {
    const mapByUser = new Map();
    if (!userIds || userIds.length === 0) return mapByUser;
    const placeholders = userIds.map(() => '?').join(',');
    const rows = db
        .prepare(`SELECT * FROM puzzle_progress WHERE user_id IN (${placeholders})`)
        .all(...userIds);
    for (const row of rows) {
        let userMap = mapByUser.get(row.user_id);
        if (!userMap) {
            userMap = new Map();
            mapByUser.set(row.user_id, userMap);
        }
        userMap.set(row.puzzle_id, row);
    }
    return mapByUser;
}

function buildGradeComment(metrics, scopeLabels) {
    const scopeText = scopeLabels.join(', ');
    return [
        `Blank Space Marine: ${metrics.grade}/${metrics.maxScore}`,
        `Scopes: ${scopeText}`,
        `Completion: ${metrics.clearedPuzzles}/${metrics.totalPuzzles} (${metrics.completionPct}%)`,
        `Accuracy: ${metrics.accuracyPct}%`
    ].join('\n');
}

function buildSubmissionHtml(studentName, metrics, scopeLabels) {
    const missingItems = metrics.missingPuzzles.slice(0, 8)
        .map((p) => `<li>${escapeHtml(p.title)} (${escapeHtml(p.sectorName)})</li>`)
        .join('');
    return [
        `<p><strong>Blank Space Marine — ${escapeHtml(studentName)}</strong></p>`,
        '<ul>',
        `<li><strong>Selected Campaigns:</strong> ${escapeHtml(scopeLabels.join(', '))}</li>`,
        `<li><strong>Missions Cleared:</strong> ${metrics.clearedPuzzles} / ${metrics.totalPuzzles} (${metrics.completionPct}%)</li>`,
        `<li><strong>Accuracy:</strong> ${metrics.accuracyPct}%</li>`,
        `<li><strong>Calculated Score:</strong> ${metrics.grade} / ${metrics.maxScore}</li>`,
        '</ul>',
        missingItems
            ? `<p><strong>Remaining Missions:</strong></p><ul>${missingItems}</ul>`
            : '<p>All selected missions cleared!</p>'
    ].join('');
}

function buildPlainTextReport(className, studentName, metrics, scopeLabels, core) {
    const lines = [
        `Blank Space Marine Progress Report — ${className}`,
        `Student: ${studentName}`,
        '',
        `Selected Campaigns: ${scopeLabels.join(', ')}`,
        `Calculated Score: ${metrics.grade} / ${metrics.maxScore}`,
        `Completion: ${metrics.clearedPuzzles} / ${metrics.totalPuzzles} missions (${metrics.completionPct}%)`,
        `Accuracy: ${metrics.accuracyPct}%`
    ];

    if (metrics.weakConcepts.length > 0) {
        lines.push('');
        lines.push('Concepts to Practice:');
        metrics.weakConcepts.forEach((cid, i) => {
            const label = (core.CONCEPT_METADATA[cid] && core.CONCEPT_METADATA[cid].label) || cid;
            lines.push(`  ${i + 1}. ${label}`);
        });
    }

    if (metrics.missingPuzzles.length > 0) {
        lines.push('');
        lines.push(`Remaining Missions (${metrics.missingPuzzles.length}):`);
        metrics.missingPuzzles.slice(0, 10).forEach((p, i) => {
            lines.push(`  ${i + 1}. ${p.title} (${p.sectorName})`);
        });
        if (metrics.missingPuzzles.length > 10) {
            lines.push(`  ...and ${metrics.missingPuzzles.length - 10} more.`);
        }
    } else {
        lines.push('');
        lines.push('Great job — all selected missions are cleared!');
    }

    return lines.join('\n');
}

router.get('/teacher', requireLogin, requireTeacher, async (req, res, next) => {
    try {
        await syncClassesForUser(req.currentUser.id, req.currentUser.formbarId);
        const classes = getTeacherClassesStmt.all(req.currentUser.id);
        res.locals.activeNav = 'teacher';
        res.render('teacher', { classes });
    } catch (err) {
        next(err);
    }
});

router.get('/teacher/classes/:classId', requireLogin, requireTeacher, requireClassTeacher, async (req, res, next) => {
    try {
        const classInfo = getClassStmt.get(req.classId);
        if (!classInfo) {
            return res.redirect('/teacher');
        }

        const core = await loadGameCore();
        const scopeCatalog = getScopeCatalog(core);
        const validScopeKeys = new Set(scopeCatalog.map((s) => s.key));
        const settingsRow = getClassSchoologyStmt.get(req.classId);
        const parsedScopes = parseSelectedScopes(
            settingsRow && settingsRow.selected_scopes_json,
            ['campaign:main']
        ).filter((key) => validScopeKeys.has(key));
        const selectedScopes = parsedScopes.length > 0 ? parsedScopes : ['campaign:main'];
        const maxScore = settingsRow && settingsRow.max_score != null ? Number(settingsRow.max_score) : 100;
        const selectedPuzzles = resolvePuzzlesForScopes(core, selectedScopes);

        const studentRows = getClassStudentsStmt.all(req.classId);
        const progressByUser = loadProgressMapForUsers(studentRows.map((s) => s.id));

        const students = studentRows.map((s) => {
            const pMap = progressByUser.get(s.id) || new Map();
            const selectedMetrics = calculateStudentScopeMetrics(selectedPuzzles, pMap, maxScore);
            const scopeBreakdown = {};
            for (const scope of scopeCatalog) {
                const puzzles = resolvePuzzlesForScopes(core, [scope.key]);
                scopeBreakdown[scope.key] = calculateStudentScopeMetrics(puzzles, pMap, 100);
            }
            const progressCompact = {};
            for (const [pid, row] of pMap.entries()) {
                if (row.clears > 0) {
                    progressCompact[pid] = {
                        clears: row.clears,
                        bestAccuracy: Number(row.best_accuracy) || 0,
                        bestScore: Number(row.best_score) || 0
                    };
                }
            }
            return {
                ...s,
                selectedMetrics,
                scopeBreakdown,
                progressCompact
            };
        });

        res.locals.activeNav = 'teacher';
        return res.render('teacher-class', {
            classInfo,
            scopeCatalog,
            students,
            schoologySettings: {
                sectionId: (settingsRow && settingsRow.schoology_section_id) || '',
                assignmentId: (settingsRow && settingsRow.schoology_assignment_id) || '',
                maxScore,
                selectedScopes
            },
            schoologyConfigured: createClient().hasConsumerKeys()
        });
    } catch (err) {
        next(err);
    }
});

router.post('/api/teacher/classes/:classId/schoology/setup', requireLogin, requireTeacher, requireClassTeacher, async (req, res, next) => {
    try {
        const body = req.body || {};
        const sectionId = String(body.sectionId || '').trim();
        const assignmentId = String(body.assignmentId || '').trim();
        const rawMax = body.maxScore;
        let maxScore = 100;

        if (rawMax !== '' && rawMax != null) {
            const parsed = Number(rawMax);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                return res.status(400).json({ error: 'Max score must be a positive number.' });
            }
            maxScore = parsed;
        }

        const core = await loadGameCore();
        const validScopeKeys = new Set(getScopeCatalog(core).map((s) => s.key));
        const selectedScopes = Array.isArray(body.selectedScopes)
            ? body.selectedScopes.map(String).filter((key) => validScopeKeys.has(key))
            : [];
        if (selectedScopes.length === 0) {
            return res.status(400).json({ error: 'Select at least one campaign.' });
        }

        const classStudentIds = new Set(
            getClassStudentsStmt.all(req.classId).map((s) => Number(s.id))
        );
        const studentMappings = Array.isArray(body.studentMappings) ? body.studentMappings : [];

        const tx = db.transaction(() => {
            upsertClassSchoologyStmt.run(
                req.classId,
                sectionId || null,
                assignmentId || null,
                maxScore,
                JSON.stringify(selectedScopes)
            );

            for (const item of studentMappings) {
                const uid = Number(item && item.userId);
                if (!classStudentIds.has(uid)) continue;
                const sid = String((item && item.schoologyId) || '').trim();
                updateStudentSchoologyIdStmt.run(sid || null, uid);
            }
        });

        tx();
        return res.json({
            success: true,
            sectionId,
            assignmentId,
            maxScore,
            selectedScopes
        });
    } catch (err) {
        return next(err);
    }
});

router.post('/api/teacher/classes/:classId/schoology/sync', requireLogin, requireTeacher, requireClassTeacher, async (req, res, next) => {
    try {
        const client = createClient();
        if (!client.hasConsumerKeys()) {
            return res.status(400).json({
                error: 'Schoology API keys (SCHOOLOGY_KEY and SCHOOLOGY_SECRET) are not configured on this server.'
            });
        }

        const classInfo = getClassStmt.get(req.classId);
        if (!classInfo) {
            return res.status(404).json({ error: 'Class not found.' });
        }

        const settingsRow = getClassSchoologyStmt.get(req.classId) || {};
        const body = req.body || {};

        const sectionId = String(
            body.sectionId !== undefined ? body.sectionId : (settingsRow.schoology_section_id || '')
        ).trim();
        const assignmentId = String(
            body.assignmentId !== undefined ? body.assignmentId : (settingsRow.schoology_assignment_id || '')
        ).trim();
        const rawMax = body.maxScore !== undefined ? body.maxScore : settingsRow.max_score;
        const maxScore = Number.isFinite(Number(rawMax)) && Number(rawMax) > 0 ? Number(rawMax) : 100;
        const selectedScopes = Array.isArray(body.selectedScopes) && body.selectedScopes.length > 0
            ? body.selectedScopes.map(String)
            : parseSelectedScopes(settingsRow.selected_scopes_json, ['campaign:main']);

        const isUploadMode = Boolean(assignmentId);
        if (isUploadMode && !sectionId) {
            return res.status(400).json({
                error: 'A Schoology Course/Section ID is required to upload assignment grades.'
            });
        }

        const core = await loadGameCore();
        const scopeCatalog = getScopeCatalog(core);
        const validScopeKeys = new Set(scopeCatalog.map((s) => s.key));
        const filteredScopes = selectedScopes.filter((key) => validScopeKeys.has(key));
        const activeScopes = filteredScopes.length > 0 ? filteredScopes : ['campaign:main'];
        const scopeLabels = activeScopes.map((key) => {
            const found = scopeCatalog.find((s) => s.key === key);
            return found ? found.label : key;
        });
        const selectedPuzzles = resolvePuzzlesForScopes(core, activeScopes);
        if (selectedPuzzles.length === 0) {
            return res.status(400).json({ error: 'No puzzles found for the selected campaigns.' });
        }

        const students = getClassStudentsStmt.all(req.classId);
        const progressByUser = loadProgressMapForUsers(students.map((s) => s.id));

        let enrollments = null;
        let gradeItemId = null;

        if (sectionId) {
            try {
                enrollments = await schoologyOps.listEnrollments(client, sectionId);
            } catch (err) {
                if (isUploadMode) {
                    return res.status(502).json({
                        error: `Failed to fetch Schoology enrollments for section ${sectionId}: ${err.message}`
                    });
                }
            }
        }

        if (isUploadMode) {
            gradeItemId = await schoologyOps.resolveGradeItemId(client, sectionId, assignmentId);
        }

        let processed = 0;
        let skipped = 0;
        let failed = 0;
        const results = [];

        for (const student of students) {
            const pMap = progressByUser.get(student.id) || new Map();
            const metrics = calculateStudentScopeMetrics(selectedPuzzles, pMap, maxScore);
            const schoologyUid = String(student.schoology_id || '').trim();

            if (!schoologyUid) {
                skipped += 1;
                results.push({
                    userId: student.id,
                    username: student.username,
                    status: 'skipped',
                    reason: 'No Schoology ID linked or set'
                });
                continue;
            }

            if (isUploadMode) {
                const enrollment = schoologyOps.findEnrollmentByUid(enrollments, schoologyUid);
                if (!enrollment) {
                    skipped += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        status: 'skipped',
                        reason: `Schoology ID ${schoologyUid} not enrolled as student in section ${sectionId}`
                    });
                    continue;
                }

                const commentText = buildGradeComment(metrics, scopeLabels);
                const htmlBody = buildSubmissionHtml(student.username, metrics, scopeLabels);

                let commentError = null;
                try {
                    await schoologyOps.createStudentComment(
                        client,
                        sectionId,
                        gradeItemId,
                        htmlBody,
                        schoologyUid
                    );
                } catch (err) {
                    commentError = err.message;
                }

                try {
                    await schoologyOps.putStudentGrade(
                        client,
                        sectionId,
                        assignmentId,
                        enrollment.id,
                        metrics.grade,
                        commentText
                    );
                    processed += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        grade: metrics.grade,
                        maxScore,
                        status: 'uploaded',
                        note: commentError ? `Grade saved (comment skipped: ${commentError})` : 'Grade and breakdown uploaded'
                    });
                } catch (err) {
                    failed += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        status: 'failed',
                        reason: err.message
                    });
                }
            } else {
                // Report by Schoology message when no assignment ID is provided
                if (enrollments && !schoologyOps.findEnrollmentByUid(enrollments, schoologyUid)) {
                    skipped += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        status: 'skipped',
                        reason: `Schoology ID ${schoologyUid} not enrolled in section ${sectionId}`
                    });
                    continue;
                }

                const subject = `Blank Space Marine Report — ${classInfo.name}`;
                const messageBody = buildPlainTextReport(
                    classInfo.name,
                    student.username,
                    metrics,
                    scopeLabels,
                    core
                );

                try {
                    await schoologyOps.sendPrivateMessage(client, {
                        recipientId: schoologyUid,
                        subject,
                        message: messageBody
                    });
                    processed += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        grade: metrics.grade,
                        maxScore,
                        status: 'sent',
                        note: 'Schoology report message sent'
                    });
                } catch (err) {
                    failed += 1;
                    results.push({
                        userId: student.id,
                        username: student.username,
                        schoologyId: schoologyUid,
                        status: 'failed',
                        reason: err.message
                    });
                }
            }
        }

        return res.json({
            success: failed === 0,
            mode: isUploadMode ? 'upload' : 'report',
            processed,
            skipped,
            failed,
            results
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
