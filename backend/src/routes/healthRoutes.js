import express from 'express';
import mongoose from 'mongoose';
import { successResponse } from '../utils/apiResponse.js';

const router = express.Router();

router.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  return successResponse(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
    },
    version: '1.0.0',
    service: 'BookLeaf Author Support Portal API',
  });
});

export default router;
