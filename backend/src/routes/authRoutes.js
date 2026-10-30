import express from 'express';
import { login, getMe, logout } from '../controllers/authController.js';
import { authenticate, validate } from '../middleware/auth.js';
import { loginSchema } from '../validators/authValidators.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
