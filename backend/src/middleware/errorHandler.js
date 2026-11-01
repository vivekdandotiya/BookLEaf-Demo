import { errorResponse } from '../utils/apiResponse.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return errorResponse(res, `Resource not found with id: ${err.value}`, 404, 'NOT_FOUND');
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return errorResponse(res, 'Database validation failed', 400, 'VALIDATION_ERROR', details);
  }

  // MongoDB Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(res, `A record with this ${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Authentication token expired', 401, 'TOKEN_EXPIRED');
  }

  // Fallback 500 - Sanitize message in production to prevent information disclosure
  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && ENV.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred'
      : (err.message || 'Internal server error');

  return errorResponse(res, message, statusCode, 'INTERNAL_SERVER_ERROR');
};

export const notFoundHandler = (req, res) => {
  return errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
};
