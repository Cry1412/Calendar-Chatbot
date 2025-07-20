const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AI Scheduling Assistant & Telegram Bot...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'Calendar Assistant', 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  console.log('\n🌐 Starting frontend application...');
  const frontend = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'Calendar Assistant', 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (error) => {
    console.error('❌ Frontend error:', error);
  });

  // Wait a moment for frontend to start, then start Telegram bot
  setTimeout(() => {
    console.log('\n🤖 Starting Telegram Bot...');
    const telegramBot = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'Telegram Bot'),
      stdio: 'inherit',
      shell: true
    });

    telegramBot.on('error', (error) => {
      console.error('❌ Telegram Bot error:', error);
    });

    // Store telegram bot process for cleanup
    global.telegramBot = telegramBot;
  }, 2000);

  // Store frontend process for cleanup
  global.frontend = frontend;
}, 2000);

backend.on('error', (error) => {
  console.error('❌ Backend error:', error);
});

// Store backend process for cleanup
global.backend = backend;

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all servers...');
  
  if (global.backend) {
    global.backend.kill();
  }
  if (global.frontend) {
    global.frontend.kill();
  }
  if (global.telegramBot) {
    global.telegramBot.kill();
  }
  
  process.exit(0);
});

console.log('✅ All services starting...');
console.log('📱 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend will be available at: http://localhost:3001');
console.log('🤖 Telegram Bot will be running on Telegram');
console.log('\nPress Ctrl+C to stop all services\n'); 