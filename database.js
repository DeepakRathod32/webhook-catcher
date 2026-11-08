import Database from "better-sqlite3";

const db = new Database('webhook.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS bins (
    bin_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    bin_id TEXT,
    method TEXT,
    headers TEXT,
    body TEXT,
    query_params TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bin_id) REFERENCES bins(bin_id)
  );
    `);

    export default db;