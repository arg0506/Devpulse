import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { DevUser } from '../../frontend/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devpulse_jwt_secret_key_9988';

// Register a new developer
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username, bio, gitHubHandle, techTags } = req.body;

    // Validate request body
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username, and password are required fields.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    if (!isPrismaEnabled()) {
      // Local JSON fallback
      const users = db.getUsers() as any[];
      const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase() || u.username === cleanUsername);
      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return res.status(400).json({ error: 'Email is already registered.' });
        }
        return res.status(400).json({ error: 'Username is already taken.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newId = `user-${Date.now()}`;
      const newUser: DevUser & { bio?: string | null; gitHubHandle?: string | null; createdAt?: string; email?: string; password?: string } = {
        id: newId,
        username: cleanUsername,
        role: 'Developer',
        avatarEmoji: '👨‍💻',
        skills: techTags || [],
        status: 'online',
        streakCount: 0,
        xpPoints: 0,
        bio: bio || null,
        gitHubHandle: gitHubHandle || null,
        createdAt: new Date().toISOString()
      };

      // Store credentials privately on the object for simple fallback authentication
      newUser.email = email.toLowerCase();
      newUser.password = hashedPassword;

      db.saveUser(newUser);

      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          bio: newUser.bio,
          gitHubHandle: newUser.gitHubHandle,
          techTags: newUser.skills,
          createdAt: newUser.createdAt
        }
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: cleanUsername }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password with robust bcrypt hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        username: cleanUsername,
        bio: bio || null,
        gitHubHandle: gitHubHandle || null,
        techTags: techTags || [],
      },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        gitHubHandle: true,
        techTags: true,
        createdAt: true,
      }
    });

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      error: 'An error occurred during registration.',
      details: error.message || 'Internal database error'
    });
  }
});

// Login developer
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { loginCredential, password } = req.body; // Can be email or username

    if (!loginCredential || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required fields.' });
    }

    const searchCredential = loginCredential.trim().toLowerCase();

    if (!isPrismaEnabled()) {
      // Local JSON fallback
      const users = db.getUsers() as any[];
      const user = users.find(u => u.email?.toLowerCase() === searchCredential || u.username === searchCredential);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password || '');
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email || `${user.username}@devpulse.local`,
          username: user.username,
          bio: user.bio,
          gitHubHandle: user.gitHubHandle,
          techTags: user.skills || [],
          createdAt: user.createdAt
        }
      });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchCredential },
          { username: searchCredential }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    // Verify password match
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        bio: user.bio,
        gitHubHandle: user.gitHubHandle,
        techTags: user.techTags,
        createdAt: user.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({
      error: 'An error occurred during login.',
      details: error.message || 'Internal database error'
    });
  }
});

// Get currently authenticated user profile
router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized profile request.' });
    }

    if (!isPrismaEnabled()) {
      const user = db.getUser(req.user.userId) as any;
      if (!user) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      return res.status(200).json({
        id: user.id,
        email: user.email || `${user.username}@devpulse.local`,
        username: user.username,
        bio: user.bio || '',
        gitHubHandle: user.gitHubHandle || '',
        techTags: user.skills || [],
        createdAt: user.createdAt || new Date().toISOString()
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        gitHubHandle: true,
        techTags: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
});

export default router;
