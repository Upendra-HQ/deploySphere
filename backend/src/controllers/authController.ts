import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { FRONTEND_URL } from '../config/appConfig';
import { sendEmail } from '../services/notificationService';

const prisma = new PrismaClient();

// Token type constants (SQLite doesn't support enums)
const TOKEN_TYPE = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

// Helper to generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'deploysphere-super-secret-jwt-key-2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide an email and password' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      if (!userExists.isVerified) {
        const tokenStr = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.verificationToken.deleteMany({
          where: {
            userId: userExists.id,
            type: TOKEN_TYPE.EMAIL_VERIFICATION,
          },
        });

        await prisma.verificationToken.create({
          data: {
            userId: userExists.id,
            token: tokenStr,
            type: TOKEN_TYPE.EMAIL_VERIFICATION,
            expiresAt,
          },
        });

        const verificationUrl = `${FRONTEND_URL}/verify-email?token=${tokenStr}`;
        await sendEmail(
          email,
          'Verify your DeploySphere Account',
          `Please verify your account by clicking this link: <a href="${verificationUrl}">${verificationUrl}</a>`
        );

        return res.status(200).json({
          message: 'Verification email sent again. Please check your email to verify your account.',
          userId: userExists.id,
        });
      }

      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Generate email verification token
    const tokenStr = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: tokenStr,
        type: TOKEN_TYPE.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${tokenStr}`;
    await sendEmail(
      email,
      'Verify your DeploySphere Account',
      `Please verify your account by clicking this link: <a href="${verificationUrl}">${verificationUrl}</a>`
    );

    return res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide an email and password' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      return res.json({
        id: user.id,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid or missing verification token' });
  }

  try {
    const dbToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: TOKEN_TYPE.EMAIL_VERIFICATION,
      },
    });

    if (!dbToken) {
      return res.status(400).json({ message: 'Token not found or invalid' });
    }

    if (dbToken.expiresAt < new Date()) {
      // Remove expired token
      await prisma.verificationToken.delete({ where: { id: dbToken.id } });
      return res.status(400).json({ message: 'Verification token has expired' });
    }

    // Update user to verified
    await prisma.user.update({
      where: { id: dbToken.userId },
      data: { isVerified: true },
    });

    // Delete token after successful verification
    await prisma.verificationToken.delete({ where: { id: dbToken.id } });

    return res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error: any) {
    console.error('Verification error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return 200/success anyway for security (don't leak user list)
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }

    // Generate password reset token
    const tokenStr = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiration

    // Clear any existing password reset tokens
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: TOKEN_TYPE.PASSWORD_RESET,
      },
    });

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: tokenStr,
        type: TOKEN_TYPE.PASSWORD_RESET,
        expiresAt,
      },
    });

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${tokenStr}`;
    await sendEmail(
      email,
      'Reset your DeploySphere Password',
      `You can reset your password by clicking this link: <a href="${resetUrl}">${resetUrl}</a>`
    );

    return res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
    const dbToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: TOKEN_TYPE.PASSWORD_RESET,
      },
    });

    if (!dbToken) {
      return res.status(400).json({ message: 'Token not found or invalid' });
    }

    if (dbToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: dbToken.id } });
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await prisma.user.update({
      where: { id: dbToken.userId },
      data: { password: hashedPassword },
    });

    // Delete token
    await prisma.verificationToken.delete({ where: { id: dbToken.id } });

    return res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
