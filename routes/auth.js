const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');
const { syncClassesForUser } = require('../lib/formbar-classes');

const router = express.Router();

function getFormbarAuthBase() {
    const raw = (process.env.AUTH_URL || 'http://localhost:420').trim();
    return raw.replace(/\/+$/, '').replace(/\/oauth$/, '');
}

function getThisUrl() {
    const port = process.env.PORT || 3000;
    const raw = (process.env.THIS_URL || `http://localhost:${port}`).trim();
    return raw.replace(/\/+$/, '');
}

function sanitizeReturnTo(value) {
    if (typeof value !== 'string') return '/';
    const trimmed = value.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
    return trimmed;
}

const findByFormbarIdStmt = db.prepare('SELECT id, formbar_id, username, permissions FROM users WHERE formbar_id = ?');
const insertUserStmt = db.prepare(
    'INSERT INTO users (formbar_id, username, permissions) VALUES (?, ?, ?)'
);
const updateUserStmt = db.prepare(
    "UPDATE users SET username = ?, permissions = ?, updated_at = datetime('now') WHERE id = ?"
);

router.get('/login', async (req, res) => {
    const authBase = getFormbarAuthBase();
    const loginCallbackUrl = `${getThisUrl()}/login`;
    const oauthRedirect = `${authBase}/oauth?redirectURL=${encodeURIComponent(loginCallbackUrl)}`;

    if (req.query.returnTo) {
        req.session.returnTo = sanitizeReturnTo(req.query.returnTo);
    }

    if (!req.query.token) {
        return res.redirect(oauthRedirect);
    }

    const tokenData = jwt.decode(req.query.token);
    if (!tokenData) {
        return res.redirect(oauthRedirect);
    }

    const rawFormbarId = tokenData.id != null ? tokenData.id : tokenData.sub;
    const formbarId = rawFormbarId != null ? String(rawFormbarId).trim() : '';
    const displayName = String(tokenData.displayName || tokenData.username || `Marine-${formbarId || '0'}`).trim();
    const permissions = Number(tokenData.permissions) || 0;

    if (!formbarId) {
        return res.redirect(oauthRedirect);
    }

    let userRow = findByFormbarIdStmt.get(formbarId);
    if (!userRow) {
        const info = insertUserStmt.run(formbarId, displayName, permissions);
        userRow = {
            id: Number(info.lastInsertRowid),
            formbar_id: formbarId,
            username: displayName,
            permissions
        };
    } else {
        updateUserStmt.run(displayName, permissions, userRow.id);
        userRow.username = displayName;
        userRow.permissions = permissions;
    }

    req.session.token = tokenData;
    req.session.userId = userRow.id;
    req.session.formbarId = formbarId;
    req.session.user = displayName;
    req.session.permissions = permissions;

    // Best-effort class membership sync from Formbar so students/teachers appear in classes right away.
    try {
        await syncClassesForUser(userRow.id, formbarId);
    } catch (err) {
        console.error('[Auth] Class sync error on login:', err.message);
    }

    const destination = sanitizeReturnTo(req.session.returnTo || '/');
    delete req.session.returnTo;
    return res.redirect(destination);
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
