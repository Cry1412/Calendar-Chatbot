const Database = require('./database');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = new Database();
  }

  async showStats() {
    try {
      console.log('📊 Loading database statistics...');
      await this.db.ensureReady();
      const requests = await this.db.getAllAppointmentRequests();
      
      console.log('\n📊 Database Statistics:');
      console.log('========================');
      console.log(`Total appointment requests: ${requests.length}`);
      
      const pending = requests.filter(r => r.status === 'pending').length;
      const accepted = requests.filter(r => r.status === 'accepted').length;
      const declined = requests.filter(r => r.status === 'declined').length;
      
      console.log(`- Pending: ${pending}`);
      console.log(`- Accepted: ${accepted}`);
      console.log(`- Declined: ${declined}`);
      
      if (requests.length > 0) {
        console.log('\n📅 Recent Requests:');
        console.log('==================');
        requests.slice(0, 5).forEach(request => {
          const date = new Date(request.createdAt).toLocaleDateString();
          const time = new Date(request.createdAt).toLocaleTimeString();
          console.log(`[${request.id}] ${request.requesterName} - ${request.status} (${date} ${time})`);
        });
      } else {
        console.log('\n📅 No requests found in database');
      }
      
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
    }
  }

  async backupDatabase() {
    try {
      const dbPath = path.join(__dirname, 'data', 'scheduling_assistant.db');
      const backupPath = path.join(__dirname, 'data', `backup_${Date.now()}.db`);
      
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Database backed up to: ${backupPath}`);
      } else {
        console.log('❌ Database file not found');
      }
    } catch (error) {
      console.error('❌ Error backing up database:', error);
    }
  }

  async clearOldRequests(daysOld = 30) {
    try {
      await this.db.ensureReady();
      const requests = await this.db.getAllAppointmentRequests();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const oldRequests = requests.filter(request => 
        new Date(request.createdAt) < cutoffDate && request.status !== 'pending'
      );
      
      console.log(`Found ${oldRequests.length} old requests to clear (older than ${daysOld} days)`);
      
      // Note: This would require adding a delete method to the Database class
      console.log('⚠️  Clear functionality not implemented yet');
      
    } catch (error) {
      console.error('❌ Error clearing old requests:', error);
    }
  }

  async close() {
    this.db.close();
  }
}

// CLI interface
async function main() {
  const manager = new DatabaseManager();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'stats':
        await manager.showStats();
        break;
      case 'backup':
        await manager.backupDatabase();
        break;
      case 'clear':
        const days = parseInt(process.argv[3]) || 30;
        await manager.clearOldRequests(days);
        break;
      default:
        console.log('Database Manager - Available commands:');
        console.log('  node db-manager.js stats    - Show database statistics');
        console.log('  node db-manager.js backup   - Create database backup');
        console.log('  node db-manager.js clear [days] - Clear old requests (default: 30 days)');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await manager.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseManager; 