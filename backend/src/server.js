import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { initSocketServer } from './sockets/socketServer.js';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.io Server
    initSocketServer(server, ENV.CLIENT_URL);

    // 4. Start HTTP Server
    server.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 BookLeaf Support API Server is RUNNING`);
      console.log(`📡 Port: ${ENV.PORT} | Environment: ${ENV.NODE_ENV}`);
      console.log(`📖 Swagger API Docs: http://localhost:${ENV.PORT}/api/docs`);
      console.log(`🏥 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
