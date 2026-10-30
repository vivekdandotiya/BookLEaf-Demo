import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'Too many login attempts, please try again in 15 minutes', 429, 'AUTH_RATE_LIMIT_EXCEEDED');
  },
});

export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'AI generation rate limit exceeded, please wait a moment', 429, 'AI_RATE_LIMIT_EXCEEDED');
  },
});
