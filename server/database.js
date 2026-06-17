const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      model TEXT,
      tokensSaved INTEGER,
      ttft REAL,
      totalTime REAL,
      type TEXT,
      message TEXT
    )`);
  }
});

function logRequest(data) {
  const { model, tokensSaved, ttft, totalTime, type, message } = data;
  db.run(
    `INSERT INTO logs (model, tokensSaved, ttft, totalTime, type, message) VALUES (?, ?, ?, ?, ?, ?)`,
    [model, tokensSaved || 0, ttft || 0, totalTime || 0, type || 'info', message || ''],
    function(err) {
      if (err) {
        console.error('Error inserting log', err.message);
      }
    }
  );
}

function getLogs(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getStats() {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT
                SUM(tokensSaved) as totalTokensSaved,
                AVG(ttft) as avgTtft,
                AVG(totalTime) as avgTotalTime,
                COUNT(*) as totalRequests
            FROM logs
            WHERE type = 'success'
        `, [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = {
  db,
  logRequest,
  getLogs,
  getStats
};
