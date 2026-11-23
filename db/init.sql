PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formbar_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    permissions INTEGER NOT NULL DEFAULT 0,
    schoology_id TEXT,
    schoology_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formbar_class_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_members (
    class_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    PRIMARY KEY (class_id, user_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    scope_key TEXT NOT NULL,
    callsign TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    total_elapsed_ms INTEGER NOT NULL DEFAULT 0,
    puzzles_cleared INTEGER NOT NULL DEFAULT 0,
    total_puzzles INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_mistakes INTEGER NOT NULL DEFAULT 0,
    hints_used INTEGER NOT NULL DEFAULT 0,
    rank_title TEXT NOT NULL,
    concept_mastery_json TEXT NOT NULL DEFAULT '[]',
    completed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runs_user_completed ON runs(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(total_score DESC, total_elapsed_ms ASC);

CREATE TABLE IF NOT EXISTS puzzle_progress (
    user_id INTEGER NOT NULL,
    puzzle_id TEXT NOT NULL,
    best_score INTEGER NOT NULL DEFAULT 0,
    best_time_ms INTEGER NOT NULL DEFAULT 0,
    clears INTEGER NOT NULL DEFAULT 0,
    total_mistakes INTEGER NOT NULL DEFAULT 0,
    min_mistakes INTEGER NOT NULL DEFAULT 0,
    best_accuracy REAL NOT NULL DEFAULT 0,
    last_cleared_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, puzzle_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_schoology_settings (
    class_id INTEGER PRIMARY KEY,
    schoology_section_id TEXT,
    schoology_assignment_id TEXT,
    max_score REAL,
    selected_scopes_json TEXT NOT NULL DEFAULT '["campaign:main"]',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
