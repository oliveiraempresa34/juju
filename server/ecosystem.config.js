module.exports = {
  apps: [{
    name: 'drift-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 2567,
      HOST: '0.0.0.0'
    },
    env_file: '.env',
    error_file: '/var/log/pm2/drift-server-error.log',
    out_file: '/var/log/pm2/drift-server-out.log',
    time: true
  }]
};
