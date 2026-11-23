const db = require('./db');

function isTeacherSession(req) {
    const perms = req.session && req.session.permissions != null
        ? Number(req.session.permissions)
        : (req.session && req.session.token && req.session.token.permissions != null
            ? Number(req.session.token.permissions)
            : 0);
    return Number.isFinite(perms) && perms >= 4;
}

function attachLocals(req, res, next) {
    const loggedIn = !!(req.session && req.session.userId);
    let currentUser = null;

    if (loggedIn) {
        const row = db
            .prepare('SELECT id, formbar_id, username, permissions, schoology_id, schoology_name FROM users WHERE id = ?')
            .get(req.session.userId);
        if (row) {
            currentUser = {
                id: row.id,
                formbarId: String(row.formbar_id),
                username: row.username,
                permissions: Number(row.permissions) || 0,
                isTeacher: Number(row.permissions) >= 4 || isTeacherSession(req),
                schoologyId: row.schoology_id || null,
                schoologyName: row.schoology_name || null
            };
        }
    }

    req.currentUser = currentUser;
    res.locals.currentUser = currentUser;
    res.locals.isTeacher = !!(currentUser && currentUser.isTeacher);
    res.locals.activeNav = '';
    next();
}

function requireLogin(req, res, next) {
    if (req.currentUser) return next();
    if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required. Please log in with Formbar.' });
    }
    const returnTo = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/login?returnTo=${returnTo}`);
}

function requireTeacher(req, res, next) {
    if (!req.currentUser) {
        if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        return res.redirect('/login');
    }
    if (req.currentUser.isTeacher) return next();
    if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ error: 'Teacher permissions required.' });
    }
    return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'Teacher permissions are required to view this page.'
    });
}

function requireClassTeacher(req, res, next) {
    const classId = Number.parseInt(req.params.classId, 10);
    if (!Number.isFinite(classId)) {
        if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
            return res.status(400).json({ error: 'Invalid class ID.' });
        }
        return res.redirect('/teacher');
    }

    const membership = db
        .prepare('SELECT role FROM class_members WHERE class_id = ? AND user_id = ?')
        .get(classId, req.currentUser.id);

    if (!membership || membership.role !== 'teacher') {
        if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
            return res.status(403).json({ error: 'You are not a teacher for this class.' });
        }
        return res.redirect('/teacher');
    }

    req.classId = classId;
    next();
}

module.exports = {
    isTeacherSession,
    attachLocals,
    requireLogin,
    requireTeacher,
    requireClassTeacher
};
