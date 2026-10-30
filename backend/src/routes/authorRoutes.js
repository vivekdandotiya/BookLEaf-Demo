import express from 'express';
import {
  getAuthorProfile,
  getAuthorBooks,
  getAuthorBookById,
  getAuthorDashboard,
} from '../controllers/authorController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and 'author' role
router.use(authenticate, requireRole('author'));

router.get('/me', getAuthorProfile);
router.get('/me/dashboard', getAuthorDashboard);
router.get('/me/books', getAuthorBooks);
router.get('/me/books/:id', getAuthorBookById);

export default router;
