const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'data', 'scheduling_assistant.db');
    this.ensureDataDirectory();
    this.db = new sqlite3.Database(this.dbPath);
    this.ready = this.init();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create appointment_requests table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS appointment_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_name TEXT NOT NULL,
            requester_contact TEXT,
            requested_date TEXT NOT NULL,
            requested_time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            description TEXT,
            telegram_chat_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            calendar_event_id TEXT,
            calendar_event_link TEXT
          )
        `, (err) => {
          if (err) {
            console.error('Error creating appointment_requests table:', err);
            reject(err);
            return;
          }

          // Create user_tokens table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS user_tokens (
              user_id TEXT PRIMARY KEY,
              access_token TEXT NOT NULL,
              refresh_token TEXT,
              scope TEXT,
              token_type TEXT,
              expiry_date DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating user_tokens table:', err);
              reject(err);
              return;
            }

            console.log('✅ Database initialized successfully');
            resolve();
          });
        });
      });
    });
  }

  // Ensure database is ready before any operation
  async ensureReady() {
    await this.ready;
  }

  // Appointment Requests Methods
  async createAppointmentRequest(requestData) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO appointment_requests (
          requester_name, requester_contact, requested_date, requested_time,
          duration, description, telegram_chat_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        requestData.requesterName,
        requestData.requesterContact || 'Telegram',
        requestData.requestedDate,
        requestData.requestedTime,
        requestData.duration,
        requestData.description || '',
        requestData.telegramChatId || null,
        'pending'
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            ...requestData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
    });
  }

  async getAllAppointmentRequests() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM appointment_requests 
        ORDER BY created_at DESC
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({
            id: row.id,
            requesterName: row.requester_name,
            requesterContact: row.requester_contact,
            requestedDate: row.requested_date,
            requestedTime: row.requested_time,
            duration: row.duration,
            description: row.description,
            telegramChatId: row.telegram_chat_id,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            calendarEventId: row.calendar_event_id,
            calendarEventLink: row.calendar_event_link
          })));
        }
      });
    });
  }

  async getAppointmentRequestById(id) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM appointment_requests WHERE id = ?`;
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            id: row.id,
            requesterName: row.requester_name,
            requesterContact: row.requester_contact,
            requestedDate: row.requested_date,
            requestedTime: row.requested_time,
            duration: row.duration,
            description: row.description,
            telegramChatId: row.telegram_chat_id,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            calendarEventId: row.calendar_event_id,
            calendarEventLink: row.calendar_event_link
          });
        }
      });
    });
  }

  async updateAppointmentRequestStatus(id, status, calendarEventId = null, calendarEventLink = null) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE appointment_requests 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        ${calendarEventId ? ', calendar_event_id = ?' : ''}
        ${calendarEventLink ? ', calendar_event_link = ?' : ''}
        WHERE id = ?
      `;
      
      const params = [status];
      if (calendarEventId) params.push(calendarEventId);
      if (calendarEventLink) params.push(calendarEventLink);
      params.push(id);

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // User Tokens Methods
  async saveUserTokens(userId, tokens) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO user_tokens (
          user_id, access_token, refresh_token, scope, token_type, expiry_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const params = [
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.scope,
        tokens.token_type,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  async getUserTokens(userId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM user_tokens WHERE user_id = ?`;
      
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            access_token: row.access_token,
            refresh_token: row.refresh_token,
            scope: row.scope,
            token_type: row.token_type,
            expiry_date: row.expiry_date
          });
        }
      });
    });
  }

  async deleteUserTokens(userId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM user_tokens WHERE user_id = ?`;
      
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Close database connection
  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database; 