const express = require('express');
const db = require('../lib/db');
const { requireLogin } = require('../lib/auth-middleware');
const { createClient } = require('../lib/schoology-client');

const router = express.Router();

function getThisUrl() {
    const port = process.env.PORT || 3000;
    return (process.env.THIS_URL || `http://localhost:${port}`).trim().replace(/\/+$/, '');
}

const updateUserSchoologyStmt = db.prepare(`
    UPDATE users
    SET schoology_id = ?, schoology_name = ?, updated_at = datetime('now')
    WHERE id = ?
`);

router.get('/auth/schoology', requireLogin, async (req, res) => {
    const client = createClient();
    const profileUrl = `/profile/${encodeURIComponent(req.currentUser.formbarId)}`;

    if (!client.hasConsumerKeys()) {
        return res.redirect(`${profileUrl}?schoologyError=${encodeURIComponent('Schoology API keys are not configured on this server.')}`);
    }

    try {
        const requestToken = await client.getRequestToken();
        req.session.schoologyRequestToken = requestToken;
        const callbackUrl = `${getThisUrl()}/auth/schoology/callback`;
        const authorizeUrl = client.getAuthorizeUrl(requestToken.key, callbackUrl);
        return res.redirect(authorizeUrl);
    } catch (err) {
        console.error('[Schoology OAuth] Failed to start 3-legged auth:', err.message);
        return res.redirect(`${profileUrl}?schoologyError=${encodeURIComponent('Could not connect to Schoology OAuth.')}`);
    }
});

router.get('/auth/schoology/callback', requireLogin, async (req, res) => {
    const profileUrl = `/profile/${encodeURIComponent(req.currentUser.formbarId)}`;
    const savedRequestToken = req.session.schoologyRequestToken;
    delete req.session.schoologyRequestToken;

    if (!savedRequestToken || !savedRequestToken.key || !savedRequestToken.secret) {
        return res.redirect(`${profileUrl}?schoologyError=${encodeURIComponent('Schoology login session expired. Please try again.')}`);
    }

    if (req.query.oauth_token && req.query.oauth_token !== savedRequestToken.key) {
        return res.redirect(`${profileUrl}?schoologyError=${encodeURIComponent('Schoology OAuth token mismatch. Please try again.')}`);
    }

    try {
        const client = createClient();
        const accessToken = await client.getAccessToken(savedRequestToken);
        const me = await client.signedRequest('GET', '/users/me', null, accessToken);

        const uid = me && (me.uid || me.id) ? String(me.uid || me.id).trim() : '';
        const name = me && (me.name_display || me.username || `${me.name_first || ''} ${me.name_last || ''}`.trim())
            ? String(me.name_display || me.username || `${me.name_first || ''} ${me.name_last || ''}`.trim()).trim()
            : null;

        if (!uid) {
            throw new Error('Schoology did not return a user ID from /users/me.');
        }

        updateUserSchoologyStmt.run(uid, name, req.currentUser.id);
        return res.redirect(`${profileUrl}?schoologyLinked=1`);
    } catch (err) {
        console.error('[Schoology OAuth] Callback failed:', err.message);
        return res.redirect(`${profileUrl}?schoologyError=${encodeURIComponent('Failed to verify Schoology account. Please try again.')}`);
    }
});

router.post('/profile/schoology/unlink', requireLogin, (req, res) => {
    updateUserSchoologyStmt.run(null, null, req.currentUser.id);
    const profileUrl = `/profile/${encodeURIComponent(req.currentUser.formbarId)}`;
    return res.redirect(`${profileUrl}?schoologyUnlinked=1`);
});

module.exports = router;
