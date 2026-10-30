import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const signToken = (payload) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, ENV.JWT_SECRET);
};
