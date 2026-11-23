require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// Initialize SQLite database & schema
require('./lib/db');
const { attachLocals } = require('./lib/auth-middleware');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const highscoresRoutes = require('./routes/highscores');
const profileRoutes = require('./routes/profile');
const schoologyAuthRoutes = require('./routes/schoology-auth');
const teacherRoutes = require('./routes/teacher');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'bsm_dev_session_secret';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Static assets for the existing browser game client, core modules, and theme
const staticOpts = {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
    }
};
app.use('/client', express.static(path.join(__dirname, 'client'), staticOpts));
app.use('/core', express.static(path.join(__dirname, 'core'), staticOpts));
app.use('/styles', express.static(path.join(__dirname, 'styles'), staticOpts));

app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use(attachLocals);

// Main game route (supports guest mode without saving scores, or Formbar logged-in mode)
app.get('/', (req, res) => {
    res.locals.activeNav = 'game';
    res.render('game');
});

app.use(authRoutes);
app.use('/api/game', gameRoutes);
app.use(highscoresRoutes);
app.use(profileRoutes);
app.use(schoologyAuthRoutes);
app.use(teacherRoutes);

// 404 handler
app.use((req, res) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found.' });
    }
    return res.status(404).render('error', {
        title: '404 — Sector Not Found',
        message: 'The requested orbital sector could not be located.'
    });
});

// Error handler
app.use((err, req, res, _next) => {
    console.error('[Server Error]', err);
    if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({ error: err.message || 'Internal server error.' });
    }
    return res.status(500).render('error', {
        title: '500 — Orbital Command Error',
        message: err.message || 'An unexpected server error occurred.'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Blank Space Marine running at http://localhost:${PORT}`);
    });
}

module.exports = app;
