import { User } from '../models/User.js';
import { Author } from '../models/Author.js';
import { signToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated. Contact administration.', 403, 'ACCOUNT_DISABLED');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLoginAt = new Date();
    await user.save();

    let authorDetails = null;
    if (user.role === 'author' && user.authorId) {
      authorDetails = await Author.findById(user.authorId);
    }

    const token = signToken({
      userId: user._id,
      role: user.role,
      authorId: user.authorId,
      email: user.email,
    });

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId,
      author_id: user.author_id,
      author: authorDetails,
    };

    return successResponse(res, { token, user: userData }, 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    let authorDetails = null;
    if (user.role === 'author' && user.authorId) {
      authorDetails = await Author.findById(user.authorId);
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId,
      author_id: user.author_id,
      author: authorDetails,
    };

    return successResponse(res, { user: userData });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return successResponse(res, { message: 'Logged out successfully' });
};
