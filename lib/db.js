const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initSqlPath = path.join(dbDir, 'init.sql');
if (fs.existsSync(initSqlPath)) {
    const schema = fs.readFileSync(initSqlPath, 'utf8');
    db.exec(schema);
}

module.exports = db;
