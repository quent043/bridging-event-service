module.exports = {
  apps: [
    {
      name: 'data-collector-service',
      script: 'dist/src/main.js', // Path to the compiled file
      instances: 1, // Single instance (you can use "max" for multi-core systems)
      autorestart: true, // Automatically restart on crash
      watch: false, // Disable file watching for production
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
