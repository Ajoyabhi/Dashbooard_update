module.exports = {
  apps: [
    {
      name: 'payment-gateway-server',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'src/logs/server-error.log',
      out_file: 'src/logs/server-out.log',
      time: true
    },
    {
      name: 'payment-gateway-worker',
      script: 'src/workers/start-worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'src/logs/worker-error.log',
      out_file: 'src/logs/worker-out.log',
      time: true
    },
    {
      name: 'payment-gateway-frontend',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: 'frontend/dist',
        PM2_SERVE_PORT: 3002,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      },
      error_file: 'src/logs/frontend-error.log',
      out_file: 'src/logs/frontend-out.log',
      time: true
    }
  ]
}; 