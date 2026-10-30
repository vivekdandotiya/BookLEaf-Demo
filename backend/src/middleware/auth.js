import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      return errorResponse(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return errorResponse(res, 'User account not found or inactive', 401, 'USER_INACTIVE');
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    req.authorId = user.authorId; // ObjectId ref to Author if role is author
    req.author_id = user.author_id; // String author_id if role is author

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 'You do not have permission to access this resource', 403, 'FORBIDDEN');
    }
    next();
  };
};

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return errorResponse(res, 'Validation failed for request body', 400, 'VALIDATION_ERROR', details);
    }
    return errorResponse(res, 'Invalid request data', 400, 'VALIDATION_ERROR');
  }
};
