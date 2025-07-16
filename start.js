const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AI Scheduling Assistant...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  console.log('\n🌐 Starting frontend application...');
  const frontend = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (error) => {
    console.error('❌ Frontend error:', error);
  });
}, 2000);

backend.on('error', (error) => {
  console.error('❌ Backend error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  process.exit(0);
});

console.log('✅ Servers starting...');
console.log('📱 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend will be available at: http://localhost:3001');
console.log('\nPress Ctrl+C to stop all servers\n'); 