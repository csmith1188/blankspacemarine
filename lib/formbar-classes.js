const axios = require('axios');
const db = require('./db');

function getFormbarApiBase() {
    const raw = (process.env.AUTH_URL || '').trim();
    if (!raw) return null;
    const trimmed = raw.replace(/\/+$/, '').replace(/\/oauth$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function normalizeClassArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const candidates = [payload.classes, payload.classrooms, payload.data];
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }
    return [];
}

/**
 * Fetches all classes the given Formbar user belongs to.
 * Returns null if Formbar API is unconfigured or fails, so local data is not wiped on transient errors.
 */
async function fetchClassesForUser(formbarId) {
    const base = getFormbarApiBase();
    const apiKey = (process.env.API_KEY || '').trim();
    if (!base || !apiKey || !formbarId) return null;

    try {
        const res = await axios.get(`${base}/user/${encodeURIComponent(formbarId)}/classes`, {
            headers: {
                API: apiKey,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });

        const rawClasses = normalizeClassArray(res.data);
        const result = [];
        const seen = new Set();

        for (const c of rawClasses) {
            if (!c || c.id == null) continue;
            const key = String(c.id);
            if (seen.has(key)) continue;
            seen.add(key);

            const isTeacher =
                c.isOwner === true ||
                String(c.owner) === String(formbarId) ||
                Number(c.permissions) >= 4;

            result.push({
                id: key,
                name: c.className || c.name || `Class ${key}`,
                role: isTeacher ? 'teacher' : 'student'
            });
        }

        return result;
    } catch (err) {
        console.error('[Formbar] Error fetching classes for user', formbarId, ':', err.message);
        return null;
    }
}

const findClassByFormbarStmt = db.prepare('SELECT id, name FROM classes WHERE formbar_class_id = ?');
const insertClassStmt = db.prepare('INSERT INTO classes (formbar_class_id, name) VALUES (?, ?)');
const updateClassNameStmt = db.prepare('UPDATE classes SET name = ? WHERE id = ?');
const upsertMemberStmt = db.prepare(
    'INSERT OR REPLACE INTO class_members (class_id, user_id, role) VALUES (?, ?, ?)'
);

/**
 * Syncs a user's Formbar classes into local SQLite `classes` and `class_members`.
 */
async function syncClassesForUser(userId, formbarId) {
    if (!userId || !formbarId) return { synced: false, classes: [] };

    const remoteClasses = await fetchClassesForUser(formbarId);
    if (remoteClasses === null) {
        return { synced: false, classes: [] };
    }

    const syncedClassIds = [];
    const resultClasses = [];

    const tx = db.transaction(() => {
        for (const c of remoteClasses) {
            let row = findClassByFormbarStmt.get(String(c.id));
            if (!row) {
                const info = insertClassStmt.run(String(c.id), c.name);
                row = { id: Number(info.lastInsertRowid), name: c.name };
            } else if (row.name !== c.name) {
                updateClassNameStmt.run(c.name, row.id);
                row.name = c.name;
            }

            const role = c.role === 'teacher' ? 'teacher' : 'student';
            upsertMemberStmt.run(row.id, userId, role);
            syncedClassIds.push(row.id);
            resultClasses.push({
                id: row.id,
                formbarClassId: String(c.id),
                name: row.name,
                role
            });
        }

        if (syncedClassIds.length > 0) {
            const placeholders = syncedClassIds.map(() => '?').join(',');
            db.prepare(
                `DELETE FROM class_members
                 WHERE user_id = ? AND class_id NOT IN (${placeholders})`
            ).run(userId, ...syncedClassIds);
        } else {
            db.prepare('DELETE FROM class_members WHERE user_id = ?').run(userId);
        }
    });

    tx();
    return { synced: true, classes: resultClasses };
}

module.exports = {
    getFormbarApiBase,
    fetchClassesForUser,
    syncClassesForUser
};
