const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateRandomDebugChallenge, generateRandomTroubleshootingChallenge, generateRandomLogicPuzzle } = require('./gameGenerator');
const { generateBuildCodeQuiz } = require('./buildCodeGenerator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
const learningMaterialDir = path.join(uploadsDir, 'learning-materials');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(learningMaterialDir)) fs.mkdirSync(learningMaterialDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const LEARNING_MATERIAL_TOPICS = new Set([
  'STRATEGI_PENYELESAIAN_MASALAH',
  'ALGORITMA',
  'PEMBOLEH_UBAH_PEMALAR_JENIS_DATA',
  'STRUKTUR_KAWALAN',
  'AMALAN_TERBAIK_PENGATURCARAAN',
  'STRUKTUR_DATA_MODULAR',
  'PEMBANGUNAN_APLIKASI',
]);

const LEARNING_MATERIAL_TYPES = new Set(['NOTES', 'VIDEO', 'EXERCISE']);
const ALLOWED_FILE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]);

const mimeExtensionMap = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

function ensureLearningMaterialDir() {
  if (!fs.existsSync(learningMaterialDir)) {
    fs.mkdirSync(learningMaterialDir, { recursive: true });
  }
}

function extractMimeAndData(base64String, fallbackMime) {
  if (!base64String) return { mime: null, data: null };
  if (base64String.startsWith('data:')) {
    const matches = /^data:(.+);base64,(.+)$/.exec(base64String);
    if (!matches) return { mime: null, data: null };
    return { mime: matches[1], data: matches[2] };
  }
  return { mime: fallbackMime ?? null, data: base64String };
}

function getExtension(name, mime) {
  if (name) {
    const existing = path.extname(name).replace('.', '');
    if (existing) return existing;
  }
  if (mime && mimeExtensionMap[mime]) {
    return mimeExtensionMap[mime];
  }
  return 'bin';
}

function deleteFileIfExists(fileUrl) {
  if (!fileUrl) return;
  const relativePath = fileUrl.replace('/uploads/', '');
  const absolutePath = path.join(uploadsDir, relativePath);
  if (absolutePath.startsWith(uploadsDir) && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      console.warn('Failed to delete file', absolutePath, err.message);
    }
  }
}

function saveBase64File(fileData) {
  if (!fileData || typeof fileData !== 'object') return null;
  const { base64, type: providedType, name } = fileData;
  if (!base64) return null;
  const { mime, data } = extractMimeAndData(base64, providedType);
  if (!mime || !data) {
    throw new Error('Invalid file data');
  }
  if (!ALLOWED_FILE_MIME_TYPES.has(mime)) {
    throw new Error('Unsupported file type');
  }
  ensureLearningMaterialDir();
  const extension = getExtension(name, mime);
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex');
  const filename = `${Date.now()}-${uniqueId}.${extension}`;
  const filePath = path.join(learningMaterialDir, filename);
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return `/uploads/learning-materials/${filename}`;
}

const prisma = new PrismaClient();

// Helper function to calculate and assign badges based on game score rankings
async function updateAllBadges() {
  try {
    // Get all students with their best game scores
    const students = await prisma.user.findMany({
      where: {
        role: 'Student',
      },
      include: {
        gameScores: {
          select: {
            score: true,
            gameType: true,
          },
        },
      },
    });

    // Calculate total best score for each student (sum of best scores from all game types)
    const studentScores = students.map((student) => {
      if (student.gameScores.length === 0) {
        return {
          id: student.id,
          bestScore: 0,
        };
      }

      // Group scores by gameType and get the best score for each game type
      const scoresByGameType = {};
      for (const score of student.gameScores) {
        // Since we now only store one score per gameType, we can just sum all scores
        // But to be safe, we'll still use Math.max per gameType in case of old data
        if (!scoresByGameType[score.gameType]) {
          scoresByGameType[score.gameType] = [];
        }
        scoresByGameType[score.gameType].push(score.score);
      }

      // Sum the best score from each game type
      const totalBestScore = Object.values(scoresByGameType).reduce((sum, scores) => {
        return sum + Math.max(...scores);
      }, 0);

      return {
        id: student.id,
        bestScore: totalBestScore,
      };
    });

    // Sort by best score (descending), then by id for consistency
    studentScores.sort((a, b) => {
      if (b.bestScore !== a.bestScore) {
        return b.bestScore - a.bestScore;
      }
      return a.id - b.id;
    });

    // Assign badges based on ranking
    for (let i = 0; i < studentScores.length; i++) {
      const student = studentScores[i];
      let badgeType;

      if (student.bestScore === 0) {
        // No scores yet - Student badge
        badgeType = 'Student';
      } else if (i < 3) {
        // Top 3 - Champion
        badgeType = 'Champion';
      } else if (i < 10) {
        // Top 4-10 - Rising Star
        badgeType = 'RisingStar';
      } else {
        // Others - Student
        badgeType = 'Student';
      }

      // Upsert badge (create or update)
      await prisma.badge.upsert({
        where: { userId: student.id },
        update: {
          badgeType: badgeType,
          score: student.bestScore,
        },
        create: {
          userId: student.id,
          badgeType: badgeType,
          score: student.bestScore,
        },
      });
    }

    // Assign Teacher badges to all teachers
    const teachers = await prisma.user.findMany({
      where: {
        role: 'Teacher',
      },
    });

    for (const teacher of teachers) {
      await prisma.badge.upsert({
        where: { userId: teacher.id },
        update: {
          badgeType: 'Teacher',
          score: null,
        },
        create: {
          userId: teacher.id,
          badgeType: 'Teacher',
          score: null,
        },
      });
    }

    console.log(`Updated badges for ${studentScores.length} students and ${teachers.length} teachers`);
  } catch (err) {
    console.error('Error updating badges:', err);
  }
}

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from database
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized - User not found' });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error', details: err.message });
  }
};

async function createNotificationsForUsers(userIds, payload) {
  if (!Array.isArray(userIds) || !userIds.length) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message ?? null,
        data: payload.data ?? null,
      })),
      skipDuplicates: false,
    });
  } catch (err) {
    console.error('Notification create error', err);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role, className } = req.body;

    // Debug logging
    console.log('Registration request received:');
    console.log('  username:', username);
    console.log('  email:', email);
    console.log('  role:', role);
    console.log('  className:', className);
    console.log('  role type:', typeof role);
    console.log('  role value:', JSON.stringify(role));

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    // Validate role if provided
    if (role && role !== 'Student' && role !== 'Teacher') {
      return res.status(400).json({ error: 'role must be either "Student" or "Teacher"' });
    }

    // Determine final role (default to Student if not provided)
    // Check for empty string, null, undefined, or falsy values
    let finalRole = 'Student';
    if (role && typeof role === 'string' && role.trim() !== '') {
      finalRole = role.trim();
    }
    console.log('  finalRole (after processing):', finalRole);

    // Check existing user by email or username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'User with that email or username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      username,
      email,
      password: hashed,
      role: finalRole
    };

    // Add className if provided (text field for class name)
    if (className && typeof className === 'string' && className.trim() !== '') {
      userData.className = className.trim();
    }

    console.log('  Creating user with data:', JSON.stringify(userData, null, 2));

    const user = await prisma.user.create({
      data: userData,
      include: { class: true }
    });

    console.log('  User created successfully:');
    console.log('    - role:', user.role);
    console.log('    - className:', user.className);

    // remove password before returning
    const { password: _pw, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    const { password: _pw, ...userSafe } = user;
    res.status(200).json({ user: userSafe, token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email does not exist' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const resetLink = `http://localhost:8081/reset-password?token=${token}`;
    console.log('Password reset link:', resetLink);

    res.json({ success: true, message: 'Reset link sent to console' });
  } catch (err) {
    console.error('Forgot password error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    console.log('Reset password request received', {
      hasToken: !!token,
      tokenLength: token?.length,
      hasPassword: !!newPassword,
      passwordLength: newPassword?.length
    });

    if (!token || typeof token !== 'string') {
      console.error('Invalid token:', typeof token, token);
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      console.error('Invalid password:', typeof newPassword);
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 1) {
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    // Find user with matching token and non-expired token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      console.error('User not found or token expired for token:', token.substring(0, 10) + '...');
      // Check if token exists but expired
      const expiredUser = await prisma.user.findFirst({
        where: { resetToken: token },
      });
      if (expiredUser) {
        return res.status(400).json({ error: 'Reset token has expired. Please request a new password reset link.' });
      }
      return res.status(400).json({ error: 'Invalid reset token. Please request a new password reset link.' });
    }

    console.log('User found, updating password for user ID:', user.id);

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log('Password successfully updated for user ID:', user.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users (supports role and partial username match)
app.get('/api/users/search', async (req, res) => {
  try {
    const { q = '', role } = req.query;

    const searchTerm = typeof q === 'string' ? q.trim() : '';
    const roleFilter = typeof role === 'string' ? role.trim() : '';

    const whereClause = {};

    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    if (searchTerm) {
      // Search in both username and email (case-insensitive)
      whereClause.OR = [
        {
          username: {
            contains: searchTerm,
          },
        },
        {
          email: {
            contains: searchTerm,
          },
        },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        className: true,
        avatarUrl: true,
        profileImage: true,
        createdAt: true,
      },
    });

    // Debug: Log to verify className is being returned
    console.log('Search users - Found', users.length, 'users');
    if (users.length > 0) {
      console.log('First user sample:', JSON.stringify(users[0], null, 2));
      // Check for Aiman specifically
      const aimanUser = users.find(u => u.username?.toLowerCase().includes('aiman'));
      if (aimanUser) {
        console.log('Found Aiman user:', JSON.stringify(aimanUser, null, 2));
        console.log('Aiman className:', aimanUser.className);
      }
    }

    res.json(users);
  } catch (err) {
    console.error('Search users error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// View account by username
app.get('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Invalid username' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password: _pw, ...userSafe } = user;
    res.json(userSafe);
  } catch (err) {
    console.error('View user error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit account by username
app.put('/api/users/:username', async (req, res) => {
  try {
    const { username: paramUsername } = req.params;
    if (!paramUsername) return res.status(400).json({ error: 'Invalid username' });

    const { username, email, password, role } = req.body;

    // Check if user exists (by username param)
    const user = await prisma.user.findUnique({ where: { username: paramUsername } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check uniqueness for username/email if changed
    if (username && username !== user.username) {
      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) return res.status(409).json({ error: 'Username already taken' });
    }
    if (email && email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== user.id) return res.status(409).json({ error: 'Email already taken' });
    }

    const data = {};
    if (username) data.username = username;
    if (email) data.email = email;
    if (typeof role !== 'undefined') data.role = role;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      data.password = hashed;
    }

    const updated = await prisma.user.update({ where: { username: paramUsername }, data });
    const { password: _p, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    console.error('Update user error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload/update avatar (accepts base64 data URI)
app.put('/api/users/:username/avatar', async (req, res) => {
  try {
    const { username } = req.params;
    const { imageBase64 } = req.body || {};

    if (!username) return res.status(400).json({ error: 'Invalid username' });
    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const normalizedDataUri = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const updated = await prisma.user.update({
      where: { username },
      data: {
        avatarUrl: null,
        profileImage: normalizedDataUri,
      }
    });
    const { password: _pw, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    console.error('Avatar upload error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account by username (teacher-only, safe cleanup of related records)
app.delete('/api/users/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Invalid username' });

    // Only teachers are allowed to delete student accounts from the teacher UI
    if (req.user?.role !== 'Teacher') {
      return res.status(403).json({ error: 'Forbidden - Only teachers can delete student accounts' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting teachers via this endpoint
    if (user.role === 'Teacher') {
      return res.status(400).json({ error: 'Cannot delete a teacher account' });
    }

    const userId = user.id;

    // Delete forum comments authored by the user
    await prisma.forumComment.deleteMany({ where: { authorId: userId } });

    // Find threads authored by the user and delete their comments first
    const userThreads = await prisma.forumThread.findMany({ where: { authorId: userId }, select: { id: true } });
    const threadIds = userThreads.map((t) => t.id);
    if (threadIds.length > 0) {
      await prisma.forumComment.deleteMany({ where: { threadId: { in: threadIds } } });
    }

    // Delete threads authored by the user
    await prisma.forumThread.deleteMany({ where: { authorId: userId } });

    // Delete learning materials authored by the user (will cascade progress entries where configured)
    await prisma.learningMaterial.deleteMany({ where: { authorId: userId } });

    // Delete other dependent records
    await prisma.gameScore.deleteMany({ where: { userId } });
    await prisma.chatLog.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.studentMaterialProgress.deleteMany({ where: { studentId: userId } });

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all classes
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(classes);
  } catch (err) {
    console.error('Get classes error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new class
app.post('/api/classes', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    const classData = await prisma.class.create({
      data: {
        name,
        description: description || null
      }
    });

    res.status(201).json(classData);
  } catch (err) {
    console.error('Create class error', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Class with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

const forumThreadInclude = {
  author: {
    select: { id: true, username: true, email: true, role: true }
  },
  comments: {
    include: {
      author: {
        select: { id: true, username: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  }
};

app.get('/api/forum/threads', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const searchTerm = typeof q === 'string' ? q.trim() : '';
    const whereClause = searchTerm
      ? {
        OR: [
          { title: { contains: searchTerm } },
          { content: { contains: searchTerm } },
          {
            comments: {
              some: {
                content: { contains: searchTerm }
              }
            }
          }
        ]
      }
      : undefined;

    const threads = await prisma.forumThread.findMany({
      where: whereClause,
      include: forumThreadInclude,
      orderBy: { updatedAt: 'desc' }
    });
    res.json(threads);
  } catch (err) {
    console.error('List threads error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced search endpoint
app.get('/api/forum/search', async (req, res) => {
  try {
    const {
      keyword = '',
      author = '',
      authorId = '',
      sortBy = 'latest',
      startDate = '',
      endDate = ''
    } = req.query;

    // Sanitize and validate keyword
    let searchKeyword = (keyword || '').toString().trim();
    // Remove potentially dangerous characters and limit length
    searchKeyword = searchKeyword.replace(/[<>]/g, '').substring(0, 200);

    const searchAuthor = (author || '').toString().trim();
    const sortOrder = sortBy === 'oldest' ? 'asc' : 'desc';

    // Validate and parse dates
    let start = null;
    let end = null;
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid start date format' });
      }
      // Check if start date is not in the future
      if (start > now) {
        return res.status(400).json({ error: 'Start date cannot be in the future' });
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      // Check if end date is not in the future
      if (end > now) {
        return res.status(400).json({ error: 'End date cannot be in the future' });
      }
    }

    // Validate date range (start < end)
    if (start && end && start > end) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date' });
    }

    // Build dynamic where clause
    const whereConditions = [];

    // Keyword search (title OR content)
    if (searchKeyword) {
      whereConditions.push({
        OR: [
          { title: { contains: searchKeyword } },
          { content: { contains: searchKeyword } },
          {
            comments: {
              some: {
                content: { contains: searchKeyword }
              }
            }
          }
        ]
      });
    }

    // Author search by id or text
    const searchAuthorId = authorId ? Number(authorId) : null;
    if (searchAuthorId && Number.isInteger(searchAuthorId)) {
      whereConditions.push({ authorId: searchAuthorId });
    } else if (searchAuthor) {
      whereConditions.push({
        OR: [
          { author: { username: { contains: searchAuthor } } },
          { author: { email: { contains: searchAuthor } } },
          { authorName: { contains: searchAuthor } },
        ]
      });
    }

    // Date range filter
    if (start) {
      whereConditions.push({
        createdAt: { gte: start }
      });
    }
    if (end) {
      // include the entire end date by setting time to end of day
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      whereConditions.push({
        createdAt: { lte: endOfDay }
      });
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : undefined;

    const threads = await prisma.forumThread.findMany({
      where: whereClause,
      include: forumThreadInclude,
      orderBy: { updatedAt: sortOrder }
    });
    res.json(threads);
  } catch (err) {
    console.error('Advanced search error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/forum/threads/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    const thread = await prisma.forumThread.findUnique({
      where: { id },
      include: forumThreadInclude
    });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (err) {
    console.error('Get thread error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/forum/threads', async (req, res) => {
  try {
    const { title, content, authorId, attachment } = req.body || {};

    // Title validation
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
      return res.status(400).json({ error: 'Title must be between 3 and 200 characters' });
    }

    // Content validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 10000) {
      return res.status(400).json({ error: 'Content must be between 10 and 10000 characters' });
    }

    // Author ID validation
    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: authorIdNum }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attachment validation
    let validatedAttachment = null;
    if (attachment && typeof attachment === 'string') {
      if (!attachment.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Only images are allowed.' });
      }

      // Check file size (base64 encoded)
      const base64Data = attachment.split(',')[1];
      if (base64Data) {
        const sizeInBytes = (base64Data.length * 3) / 4;
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (sizeInBytes > maxSize) {
          return res.status(400).json({ error: 'Image size exceeds 5MB limit' });
        }
      }
      validatedAttachment = attachment;
    }

    const thread = await prisma.forumThread.create({
      data: {
        title: trimmedTitle,
        content: trimmedContent,
        authorId: authorIdNum,
        attachment: validatedAttachment
      },
      include: forumThreadInclude
    });
    try {
      const recipients = await prisma.user.findMany({
        where: {
          id: { not: authorIdNum },
          notifyNewForumThreads: true,
        },
        select: { id: true, username: true, email: true },
      });
      if (recipients.length) {
        await createNotificationsForUsers(
          recipients.map((recipient) => recipient.id),
          {
            type: 'NEW_FORUM_THREAD',
            title: 'New forum discussion',
            message: `${thread.author?.username || thread.author?.email || 'Someone'} started "${thread.title}"`,
            data: { threadId: thread.id },
          }
        );
      }
    } catch (notifyErr) {
      console.error('Thread notification dispatch error', notifyErr);
    }
    res.status(201).json(thread);
  } catch (err) {
    console.error('Create thread error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/forum/threads/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    const { title, content, authorId, attachment } = req.body || {};

    // Title validation
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
      return res.status(400).json({ error: 'Title must be between 3 and 200 characters' });
    }

    // Content validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 10000) {
      return res.status(400).json({ error: 'Content must be between 10 and 10000 characters' });
    }

    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const thread = await prisma.forumThread.findUnique({ where: { id } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (Number(thread.authorId) !== Number(authorIdNum)) {
      return res.status(403).json({ error: 'You can only edit threads you created' });
    }

    const data = {
      title: trimmedTitle,
      content: trimmedContent
    };

    if (typeof attachment !== 'undefined') {
      if (attachment && typeof attachment === 'string') {
        if (!attachment.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid image format. Only images are allowed.' });
        }

        // Check file size
        const base64Data = attachment.split(',')[1];
        if (base64Data) {
          const sizeInBytes = (base64Data.length * 3) / 4;
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (sizeInBytes > maxSize) {
            return res.status(400).json({ error: 'Image size exceeds 5MB limit' });
          }
        }
        data.attachment = attachment;
      } else {
        data.attachment = null;
      }
    }

    const updated = await prisma.forumThread.update({
      where: { id },
      data,
      include: forumThreadInclude
    });
    res.json(updated);
  } catch (err) {
    console.error('Update thread error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/forum/threads/:id/comments', async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    if (!Number.isInteger(threadId)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    const { content, authorId } = req.body || {};

    // Comment validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Comment content is required and must be a string' });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1) {
      return res.status(400).json({ error: 'Comment must be at least 1 character long' });
    }
    if (trimmedContent.length > 5000) {
      return res.status(400).json({ error: 'Comment must not exceed 5000 characters' });
    }

    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: authorIdNum }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const comment = await prisma.forumComment.create({
      data: {
        content: trimmedContent,
        threadId,
        authorId: authorIdNum
      },
      include: {
        author: { select: { id: true, username: true, email: true, role: true } },
        thread: false
      }
    });
    await prisma.forumThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    });
    try {
      if (thread.authorId !== authorIdNum) {
        const threadAuthor = await prisma.user.findUnique({
          where: { id: thread.authorId },
          select: {
            id: true,
            notifyForumReplies: true,
          },
        });
        if (threadAuthor?.notifyForumReplies) {
          await createNotificationsForUsers([threadAuthor.id], {
            type: 'FORUM_REPLY',
            title: 'New reply in your discussion',
            message: `${comment.author?.username || comment.author?.email || 'Someone'} replied to "${thread.title}"`,
            data: {
              threadId,
              commentId: comment.id,
            },
          });
        }
      }
    } catch (notifyErr) {
      console.error('Forum reply notification error', notifyErr);
    }
    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/forum/comments/:commentId', async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    if (!Number.isInteger(commentId)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }
    const { content, authorId } = req.body || {};

    // Comment validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Comment content is required and must be a string' });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1) {
      return res.status(400).json({ error: 'Comment must be at least 1 character long' });
    }
    if (trimmedContent.length > 5000) {
      return res.status(400).json({ error: 'Comment must not exceed 5000 characters' });
    }

    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }
    const existing = await prisma.forumComment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { id: true, username: true, email: true, role: true } }
      }
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });
    if (existing.authorId !== authorIdNum) {
      return res.status(403).json({ error: 'You can only edit comments you created' });
    }

    const updated = await prisma.forumComment.update({
      where: { id: commentId },
      data: { content: trimmedContent },
      include: {
        author: { select: { id: true, username: true, email: true, role: true } }
      }
    });
    await prisma.forumThread.update({
      where: { id: existing.threadId },
      data: { updatedAt: new Date() }
    });
    res.json(updated);
  } catch (err) {
    console.error('Update comment error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/forum/threads/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }
    const actorId = Number(req.query.authorId ?? req.body?.authorId);
    if (!Number.isInteger(actorId)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, role: true } },
      },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const isOwner = Number(thread.authorId) === Number(actorId);

    // Check if actor is a teacher trying to delete a student's thread
    let hasPermission = isOwner;
    if (!isOwner) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, role: true },
      });
      if (!actor) {
        return res.status(404).json({ error: 'User not found' });
      }

      const actorIsTeacher = actor.role === 'Teacher';
      const targetIsStudent = thread.author && thread.author.role === 'Student';
      hasPermission = actorIsTeacher && targetIsStudent;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to delete this thread' });
    }

    // Delete all comments first (to handle foreign key constraints)
    await prisma.forumComment.deleteMany({ where: { threadId: id } });

    // Then delete the thread
    await prisma.forumThread.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete thread error', err);
    console.error('Error details:', {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/forum/comments/:commentId', async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const { authorId } = req.body || {};
    if (!Number.isInteger(commentId)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }
    const actorId = Number(authorId);
    if (!Number.isInteger(actorId)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const existing = await prisma.forumComment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { id: true, role: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true },
    });
    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOwner = existing.authorId === actorId;
    const actorIsTeacher = actor.role === 'Teacher';
    const targetIsStudent = existing.author && existing.author.role === 'Student';

    if (!isOwner && !(actorIsTeacher && targetIsStudent)) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    await prisma.forumComment.delete({ where: { id: commentId } });
    await prisma.forumThread.update({
      where: { id: existing.threadId },
      data: { updatedAt: new Date() }
    });
    res.json({ success: true, threadId: existing.threadId });
  } catch (err) {
    console.error('Delete comment error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const learningMaterialInclude = {
  author: {
    select: { id: true, username: true, email: true, role: true },
  },
};

function normalizeLearningMaterial(material) {
  return {
    ...material,
    id: Number(material.id),
    authorId: Number(material.authorId),
    author: undefined,
    authorName: material.author?.username || material.author?.email || 'Unknown',
  };
}

app.get('/api/learning-materials', async (req, res) => {
  try {
    const { q = '', topic = '', type = '' } = req.query;
    const searchTerm = typeof q === 'string' ? q.trim() : '';
    const topicFilterRaw = typeof topic === 'string' ? topic.trim() : '';
    const typeFilterRaw = typeof type === 'string' ? type.trim() : '';

    const andFilters = [];

    if (topicFilterRaw) {
      const topicFilter = topicFilterRaw.toUpperCase();
      if (topicFilter !== 'ALL') {
        if (!LEARNING_MATERIAL_TOPICS.has(topicFilter)) {
          return res.status(400).json({ error: 'Invalid topic filter' });
        }
        andFilters.push({ topic: topicFilter });
      }
    }

    if (typeFilterRaw) {
      const typeFilter = typeFilterRaw.toUpperCase();
      if (typeFilter !== 'ALL') {
        if (!LEARNING_MATERIAL_TYPES.has(typeFilter)) {
          return res.status(400).json({ error: 'Invalid type filter' });
        }
        andFilters.push({ materialType: typeFilter });
      }
    }

    const whereClause = andFilters.length ? { AND: andFilters } : undefined;

    const materials = await prisma.learningMaterial.findMany({
      where: whereClause,
      include: learningMaterialInclude,
      orderBy: { updatedAt: 'desc' },
    });
    const normalized = materials.map(normalizeLearningMaterial);

    const filtered = searchTerm
      ? normalized.filter((material) => {
        const query = searchTerm.toLowerCase();
        const title = material.title?.toLowerCase() ?? '';
        const description = material.description?.toLowerCase() ?? '';
        return title.includes(query) || description.includes(query);
      })
      : normalized;

    res.json(filtered);
  } catch (err) {
    console.error('List learning materials error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/learning-materials/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid material id' });
    }
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: learningMaterialInclude,
    });
    if (!material) {
      return res.status(404).json({ error: 'Learning material not found' });
    }
    res.json(normalizeLearningMaterial(material));
  } catch (err) {
    console.error('Get learning material error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/learning-materials', async (req, res) => {
  try {
    const {
      title,
      description,
      topic,
      materialType,
      authorId,
      fileData,
      videoUrl,
    } = req.body || {};

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!topic || !LEARNING_MATERIAL_TOPICS.has(String(topic).toUpperCase())) {
      return res.status(400).json({ error: 'Valid topic is required' });
    }
    if (!materialType || !LEARNING_MATERIAL_TYPES.has(String(materialType).toUpperCase())) {
      return res.status(400).json({ error: 'Valid material type is required' });
    }
    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const author = await prisma.user.findUnique({ where: { id: authorIdNum } });
    if (!author || author.role !== 'Teacher') {
      return res.status(403).json({ error: 'Only teachers can upload learning materials' });
    }

    let storedFileUrl = null;
    if (materialType !== 'VIDEO' && fileData) {
      try {
        storedFileUrl = saveBase64File(fileData);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Failed to process file upload' });
      }
    }

    const material = await prisma.learningMaterial.create({
      data: {
        title,
        description: description || null,
        topic: String(topic).toUpperCase(),
        materialType: String(materialType).toUpperCase(),
        authorId: authorIdNum,
        fileUrl: storedFileUrl,
        videoUrl: materialType === 'VIDEO' ? (videoUrl || null) : null,
      },
      include: learningMaterialInclude,
    });
    try {
      const recipients = await prisma.user.findMany({
        where: {
          id: { not: authorIdNum },
          notifyNewLearningMaterials: true,
        },
        select: { id: true },
      });
      if (recipients.length) {
        await createNotificationsForUsers(
          recipients.map((recipient) => recipient.id),
          {
            type: 'NEW_LEARNING_MATERIAL',
            title: 'New learning material',
            message: `${author.username || author.email || 'A teacher'} shared "${material.title}"`,
            data: { materialId: material.id },
          }
        );
      }
    } catch (notifyErr) {
      console.error('Learning material notification error', notifyErr);
    }
    res.status(201).json(normalizeLearningMaterial(material));
  } catch (err) {
    console.error('Create learning material error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/learning-materials/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid material id' });
    }

    const {
      title,
      description,
      topic,
      materialType,
      authorId,
      fileData,
      videoUrl,
      removeFile,
    } = req.body || {};

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!topic || !LEARNING_MATERIAL_TOPICS.has(String(topic).toUpperCase())) {
      return res.status(400).json({ error: 'Valid topic is required' });
    }
    if (!materialType || !LEARNING_MATERIAL_TYPES.has(String(materialType).toUpperCase())) {
      return res.status(400).json({ error: 'Valid material type is required' });
    }
    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const existing = await prisma.learningMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Learning material not found' });
    }
    if (existing.authorId !== authorIdNum) {
      return res.status(403).json({ error: 'You can only update your own learning materials' });
    }

    let storedFileUrl = existing.fileUrl;
    if (materialType !== 'VIDEO') {
      if (fileData) {
        try {
          const newFileUrl = saveBase64File(fileData);
          if (storedFileUrl && storedFileUrl !== newFileUrl) {
            deleteFileIfExists(storedFileUrl);
          }
          storedFileUrl = newFileUrl;
        } catch (err) {
          return res.status(400).json({ error: err.message || 'Failed to process file upload' });
        }
      } else if (removeFile) {
        deleteFileIfExists(storedFileUrl);
        storedFileUrl = null;
      }
    } else {
      if (storedFileUrl) {
        deleteFileIfExists(storedFileUrl);
      }
      storedFileUrl = null;
    }

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data: {
        title,
        description: description || null,
        topic: String(topic).toUpperCase(),
        materialType: String(materialType).toUpperCase(),
        fileUrl: storedFileUrl,
        videoUrl: String(materialType).toUpperCase() === 'VIDEO' ? (videoUrl || null) : null,
      },
      include: learningMaterialInclude,
    });
    res.json(normalizeLearningMaterial(updated));
  } catch (err) {
    console.error('Update learning material error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/learning-materials/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const authorId = Number(req.body?.authorId ?? req.query?.authorId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid material id' });
    }
    if (!Number.isInteger(authorId)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const existing = await prisma.learningMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Learning material not found' });
    }
    if (existing.authorId !== authorId) {
      return res.status(403).json({ error: 'You can only delete your own learning materials' });
    }

    if (existing.fileUrl) {
      deleteFileIfExists(existing.fileUrl);
    }

    await prisma.learningMaterial.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete learning material error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download endpoint for learning materials
app.get('/api/learning-materials/download/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid material id' });
    }

    const material = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!material || !material.fileUrl) {
      return res.status(404).send('File not found');
    }

    // Resolve the file path
    const relativePath = material.fileUrl.replace('/uploads/', '');
    const fullPath = path.join(uploadsDir, relativePath);

    // Security check: ensure the path is within uploads directory
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File not found on server');
    }

    // Extract filename from fileUrl for Content-Disposition header
    const filename = path.basename(material.fileUrl) || `material_${id}.pdf`;

    // Set headers to force download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (err) {
    console.error('Download learning material error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    console.error('List notifications error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notifications/mark-read', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const id = Number(userId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }
    await prisma.notification.updateMany({
      where: { userId: id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notifications/:id/mark-read', async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const { userId } = req.body || {};
    const userIdNum = Number(userId);

    if (!Number.isInteger(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }
    if (!Number.isInteger(userIdNum)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userIdNum) {
      return res.status(403).json({ error: 'Not authorized to mark this notification' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const { userId } = req.body || {};
    const userIdNum = Number(userId);

    if (!Number.isInteger(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }
    if (!Number.isInteger(userIdNum)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userIdNum) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/notifications/clear', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const id = Number(userId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }
    await prisma.notification.deleteMany({
      where: { userId: id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Clear notifications error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/notifications/preferences', async (req, res) => {
  try {
    const { userId, notifyNewForumThreads, notifyNewLearningMaterials, notifyForumReplies } =
      req.body || {};
    const id = Number(userId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }
    const data = {};
    if (typeof notifyNewForumThreads === 'boolean') {
      data.notifyNewForumThreads = notifyNewForumThreads;
    }
    if (typeof notifyNewLearningMaterials === 'boolean') {
      data.notifyNewLearningMaterials = notifyNewLearningMaterials;
    }
    if (typeof notifyForumReplies === 'boolean') {
      data.notifyForumReplies = notifyForumReplies;
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No valid preference flags provided' });
    }
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        notifyNewForumThreads: true,
        notifyNewLearningMaterials: true,
        notifyForumReplies: true,
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update notification preferences error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Game API Routes

// GET A 10-QUESTION QUIZ
app.get('/api/games/debugging/quiz', authMiddleware, async (req, res) => {
  try {
    // Get the user ID from the middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Generating quiz for user:', userId);

    // Generate a pool of challenges first (faster approach)
    const challengePool = [];
    const poolSize = 30; // Generate 30 to ensure variety

    for (let i = 0; i < poolSize; i++) {
      challengePool.push(generateRandomDebugChallenge());
    }

    // Filter for unique challenges based on code block
    const seenCodeBlocks = new Set();
    const uniqueChallenges = [];

    for (const challenge of challengePool) {
      const codeKey = challenge.codeBlock.trim();
      if (!seenCodeBlocks.has(codeKey)) {
        seenCodeBlocks.add(codeKey);
        uniqueChallenges.push(challenge);
        if (uniqueChallenges.length >= 10) break; // Stop when we have 10
      }
    }

    // If we don't have 10 unique, fill with remaining from pool (allow some duplicates if needed)
    if (uniqueChallenges.length < 10) {
      const remaining = challengePool.filter(c => !seenCodeBlocks.has(c.codeBlock.trim()));
      uniqueChallenges.push(...remaining.slice(0, 10 - uniqueChallenges.length));
    }

    // Fisher-Yates shuffle algorithm
    for (let i = uniqueChallenges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueChallenges[i], uniqueChallenges[j]] = [uniqueChallenges[j], uniqueChallenges[i]];
    }

    console.log('Generated', uniqueChallenges.length, 'challenges');
    res.json(uniqueChallenges.slice(0, 10)); // Return up to 10 challenges
  } catch (err) {
    console.error('Error generating quiz:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
  }
});

// GET /api/games/troubleshooting/quiz - Get a 10-question troubleshooting quiz
app.get('/api/games/troubleshooting/quiz', authMiddleware, (req, res) => {
  try {
    // Generate a pool of challenges first (faster approach)
    const challengePool = [];
    const poolSize = 30; // Generate 30 to ensure variety

    for (let i = 0; i < poolSize; i++) {
      challengePool.push(generateRandomTroubleshootingChallenge());
    }

    // Filter for unique challenges based on code block
    const seenCodeBlocks = new Set();
    const uniqueChallenges = [];

    for (const challenge of challengePool) {
      const codeKey = challenge.codeBlock.trim();
      if (!seenCodeBlocks.has(codeKey)) {
        seenCodeBlocks.add(codeKey);
        uniqueChallenges.push(challenge);
        if (uniqueChallenges.length >= 10) break; // Stop when we have 10
      }
    }

    // If we don't have 10 unique, fill with remaining from pool (allow some duplicates if needed)
    if (uniqueChallenges.length < 10) {
      const remaining = challengePool.filter(c => !seenCodeBlocks.has(c.codeBlock.trim()));
      uniqueChallenges.push(...remaining.slice(0, 10 - uniqueChallenges.length));
    }

    // Shuffle the final challenges
    uniqueChallenges.sort(() => Math.random() - 0.5);

    console.log('Generated', uniqueChallenges.length, 'troubleshooting challenges');
    res.json(uniqueChallenges.slice(0, 10)); // Return up to 10 challenges
  } catch (err) {
    console.error('Error generating troubleshooting quiz:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
  }
});

// GET /api/games/build-a-code/quiz - Get a 10-question code assembly quiz
app.get('/api/games/build-a-code/quiz', authMiddleware, (req, res) => {
  try {
    const challenges = generateBuildCodeQuiz();
    console.log('Generated', challenges.length, 'build-a-code challenges');
    res.json(challenges);
  } catch (err) {
    console.error('Error generating build-a-code quiz:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
  }
});

// GET /api/games/logic-puzzles/quiz - Get a 10-question logic puzzles quiz
app.get('/api/games/logic-puzzles/quiz', authMiddleware, (req, res) => {
  try {
    const challenges = [];
    const seenCodeBlocks = new Set(); // Track unique code blocks to avoid duplicates
    let attempts = 0;
    const maxAttempts = 100; // Increased safety limit

    // Generate challenges until we have 10 unique ones
    while (challenges.length < 10 && attempts < maxAttempts) {
      attempts++;
      try {
        const challenge = generateRandomLogicPuzzle();

        if (!challenge || !challenge.codeBlock) {
          console.warn('Invalid challenge generated, skipping');
          continue;
        }

        // Use code block as unique identifier
        const codeKey = challenge.codeBlock.trim();

        // Only add if we haven't seen this code block before
        if (!seenCodeBlocks.has(codeKey)) {
          seenCodeBlocks.add(codeKey);
          challenges.push(challenge);
        }
      } catch (genError) {
        console.error('Error generating single challenge:', genError);
        // Continue trying to generate more
        continue;
      }
    }

    if (challenges.length === 0) {
      return res.status(500).json({ error: 'Failed to generate any challenges' });
    }

    // Shuffle the final challenges
    challenges.sort(() => Math.random() - 0.5);

    console.log('Generated', challenges.length, 'unique logic puzzle challenges');
    res.json(challenges); // Returns an array of challenges
  } catch (err) {
    console.error('Error generating logic puzzles quiz:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to generate quiz', details: err.message });
  }
});

// POST /api/games/submit-quiz - Submits a full 10-question quiz
app.post('/api/games/submit-quiz', authMiddleware, async (req, res) => {
  try {
    // Get the user ID from the middleware
    const userId = req.user.id;
    const { answers, totalTimeMs } = req.body || {};

    // Read lang from query string (default to 'en')
    const lang = req.query.lang || 'en';

    // 'answers' is an array: [{ challenge, selectedLine, timeMs }, ...]
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid quiz submission' });
    }

    let totalScore = 0;
    let correctCount = 0;
    const feedback = []; // Array to store wrong answers

    // Scoring function based on time
    const calculateScore = (timeMs, isCorrect) => {
      if (!isCorrect) {
        return 0; // Wrong answer = 0 points
      }

      const timeSeconds = timeMs / 1000; // Convert to seconds

      if (timeSeconds < 15) {
        return 500; // Under 15 seconds = 500 points
      } else if (timeSeconds < 30) {
        return 375; // Under 30 seconds = 375 points
      } else {
        return 250; // 30 seconds or more = 250 points
      }
    };

    for (const answer of answers) {
      const { challenge, selectedLine, selectedFix, selectedOutput, timeMs, userOrder } = answer;

      // Calculate time per question (use provided timeMs or fallback to average)
      const questionTime = timeMs || (totalTimeMs ? totalTimeMs / answers.length : 30000);

      // For debugging challenges with fix options, validate both line and fix
      let isCorrect = false;
      if (challenge.correctOutput !== undefined) {
        // Logic Puzzles: check if selected output matches correct output
        isCorrect = (selectedOutput === challenge.correctOutput);
      } else if (challenge.fixOptions && challenge.correctFix) {
        // New debugging mechanics: check both line and fix
        isCorrect = (challenge.buggyLineIndex === selectedLine) &&
          (selectedFix === challenge.correctFix);
      } else if (challenge.correctOrder && userOrder) {
        // Build-a-Code: check if order matches
        isCorrect = (JSON.stringify(userOrder) === JSON.stringify(challenge.correctOrder));
      } else {
        // Troubleshooting or old format: just check line
        isCorrect = (challenge.buggyLineIndex === selectedLine);
      }

      // Calculate score based on time and correctness
      const questionScore = calculateScore(questionTime, isCorrect);
      totalScore += questionScore;

      if (isCorrect) {
        correctCount++;
      } else {
        // Add wrong answer to feedback array
        const explanation = challenge.explanation
          ? (challenge.explanation[lang] || challenge.explanation.en || 'No explanation available')
          : (challenge.scenario?.[lang] || challenge.scenario?.en || 'No explanation available');

        feedback.push({
          title: challenge.title[lang] || challenge.title.en || 'Challenge',
          explanation: explanation,
        });
      }
    }

    // Determine game type (allow client to specify, fallback to debugging)
    const gameType = (req.body && typeof req.body.gameType === 'string') ? req.body.gameType : 'DEBUGGING_QUIZ';

    // Find the best existing score for this user and game type
    const existingScores = await prisma.gameScore.findMany({
      where: {
        userId: userId,
        gameType: gameType,
      },
      orderBy: {
        score: 'desc',
      },
      take: 1,
    });

    const bestExistingScore = existingScores.length > 0 ? existingScores[0].score : 0;

    // Only save if this is a new best score (higher than previous best)
    if (totalScore > bestExistingScore) {
      // Delete all previous scores for this user+gameType (we only keep the best)
      await prisma.gameScore.deleteMany({
        where: {
          userId: userId,
          gameType: gameType,
        },
      });

      // Save the new best score
      await prisma.gameScore.create({
        data: {
          userId: userId,
          score: totalScore,
          gameType: gameType,
        },
      });
    }

    // Update all badges after new score is submitted
    await updateAllBadges();

    res.json({
      isComplete: true,
      totalScore: totalScore,
      correctCount: correctCount,
      totalQuestions: answers.length,
      feedback: feedback, // Include feedback array in response
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// GET /api/leaderboard - Get top 50 users and current user's rank (aggregated by game type)
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Get all game scores
    const allScores = await prisma.gameScore.findMany({
      select: {
        userId: true,
        score: true,
        gameType: true,
      },
    });

    // Group scores by userId and gameType, getting the best score for each combination
    const userGameScores = {};
    for (const scoreRecord of allScores) {
      const key = `${scoreRecord.userId}_${scoreRecord.gameType}`;
      if (!userGameScores[key]) {
        userGameScores[key] = {
          userId: scoreRecord.userId,
          gameType: scoreRecord.gameType,
          score: scoreRecord.score,
        };
      } else {
        // Keep the highest score for this user+gameType combination
        userGameScores[key].score = Math.max(userGameScores[key].score, scoreRecord.score);
      }
    }

    // Aggregate total score by userId (sum of best scores per gameType)
    const userTotalScores = {};
    for (const scoreRecord of Object.values(userGameScores)) {
      if (!userTotalScores[scoreRecord.userId]) {
        userTotalScores[scoreRecord.userId] = 0;
      }
      userTotalScores[scoreRecord.userId] += scoreRecord.score;
    }

    // Create sorted leaderboard
    const sortedUsers = Object.entries(userTotalScores)
      .map(([userId, totalScore]) => ({
        userId: parseInt(userId),
        totalScore,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Get user details for all users with scores
    const userIds = sortedUsers.map((item) => item.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        profileImage: true,
        role: true,
        badge: {
          select: {
            badgeType: true,
          },
        },
      },
    });

    // Create a map for quick user lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Build leaderboard array with top 50
    const leaderboard = sortedUsers.slice(0, 50).map((item, index) => {
      const user = userMap.get(item.userId);
      return {
        rank: index + 1,
        userId: item.userId,
        username: user?.username || 'Unknown',
        avatarUrl: user?.avatarUrl || null,
        profileImage: user?.profileImage || null,
        role: user?.role || 'Student',
        totalScore: item.totalScore,
        badgeType: user?.badge?.badgeType || 'Student',
      };
    });

    // Find current user's rank
    const currentUserIndex = sortedUsers.findIndex((item) => item.userId === currentUserId);
    let userRank = null;

    if (currentUserIndex !== -1) {
      const currentUserItem = sortedUsers[currentUserIndex];
      const currentUser = userMap.get(currentUserId);
      userRank = {
        rank: currentUserIndex + 1,
        userId: currentUserId,
        username: currentUser?.username || 'Unknown',
        avatarUrl: currentUser?.avatarUrl || null,
        profileImage: currentUser?.profileImage || null,
        role: currentUser?.role || 'Student',
        totalScore: currentUserItem.totalScore,
        badgeType: currentUser?.badge?.badgeType || 'Student',
      };
    } else {
      // User has no scores yet
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          profileImage: true,
          role: true,
          badge: {
            select: {
              badgeType: true,
            },
          },
        },
      });

      if (currentUser) {
        userRank = {
          rank: null,
          userId: currentUserId,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          profileImage: currentUser.profileImage,
          role: currentUser.role,
          totalScore: 0,
          badgeType: currentUser.badge?.badgeType || 'Student',
        };
      }
    }

    res.json({
      leaderboard,
      userRank,
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/teacher/students - Get all students with their progress stats
app.get('/api/teacher/students', authMiddleware, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'Teacher') {
      return res.status(403).json({ error: 'Forbidden - Only teachers can access this endpoint' });
    }

    // Fetch all students with their statistics
    const students = await prisma.user.findMany({
      where: {
        role: 'Student',
      },
      select: {
        id: true,
        username: true,
        email: true,
        className: true,
        avatarUrl: true,
        profileImage: true,
        gameScores: {
          select: {
            score: true,
            gameType: true,
          },
        },
        _count: {
          select: {
            chatLogs: true,
            forumThreads: true,
            forumComments: true,
          },
        },
      },
      orderBy: {
        username: 'asc',
      },
    });

    // Process students to include stats
    const studentsWithStats = students.map((student) => {
      const attempts = student.gameScores ? student.gameScores.length : 0;
      const bestScore = student.gameScores && student.gameScores.length > 0
        ? Math.max(...student.gameScores.map((s) => s.score))
        : 0;

      // Group game scores by gameType
      const gameStats = {};
      if (student.gameScores && student.gameScores.length > 0) {
        student.gameScores.forEach((score) => {
          const gameType = score.gameType || 'UNKNOWN';
          if (!gameStats[gameType]) {
            gameStats[gameType] = { attempts: 0, bestScore: 0 };
          }
          gameStats[gameType].attempts += 1;
          gameStats[gameType].bestScore = Math.max(gameStats[gameType].bestScore, score.score);
        });
      }

      return {
        id: student.id,
        username: student.username,
        email: student.email,
        className: student.className,
        avatarUrl: student.avatarUrl,
        profileImage: student.profileImage,
        attempts: attempts,
        bestScore: bestScore,
        chatLogsCount: student._count.chatLogs,
        forumThreadsCount: student._count.forumThreads,
        forumCommentsCount: student._count.forumComments,
        gameStats: gameStats,
      };
    });

    res.json(studentsWithStats);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/teacher/students/:id/details - Get detailed stats for a specific student
app.get('/api/teacher/students/:id/details', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/teacher/students/:id/details - Request received', {
      studentId: req.params.id,
      userId: req.user?.id,
      role: req.user?.role
    });

    // Check if user is a teacher
    if (req.user.role !== 'Teacher') {
      return res.status(403).json({ error: 'Forbidden - Only teachers can access this endpoint' });
    }

    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Verify the student exists and is actually a student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'Student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Fetch full profile info
    console.log('Fetching profile for student:', studentId);
    const profile = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        username: true,
        email: true,
        className: true,
        avatarUrl: true,
        profileImage: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Fetch game stats grouped by gameType
    console.log('Fetching game scores for student:', studentId);
    const gameScores = await prisma.gameScore.findMany({
      where: { userId: studentId },
      select: {
        score: true,
        gameType: true,
      },
    });

    const gameStats = {};
    gameScores.forEach((score) => {
      const gameType = score.gameType || 'UNKNOWN';
      if (!gameStats[gameType]) {
        gameStats[gameType] = { attempts: 0, bestScore: 0 };
      }
      gameStats[gameType].attempts += 1;
      gameStats[gameType].bestScore = Math.max(gameStats[gameType].bestScore, score.score);
    });

    // Fetch material progress
    console.log('Fetching material progress for student:', studentId);
    const materialProgress = await prisma.studentMaterialProgress.findMany({
      where: {
        studentId: studentId,
        isCompleted: true,
      },
      select: {
        materialId: true,
      },
    });

    // Get total materials count
    const totalMaterials = await prisma.learningMaterial.count();
    const completedCount = materialProgress.length;
    const progressPercentage = totalMaterials > 0
      ? Math.round((completedCount / totalMaterials) * 100)
      : 0;

    // Fetch chat logs (last 50)
    console.log('Fetching chat logs for student:', studentId);
    const chatLogs = await prisma.chatLog.findMany({
      where: {
        userId: studentId,
      },
      select: {
        id: true,
        message: true,
        response: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Fetch forum stats
    console.log('Fetching forum stats for student:', studentId);
    const forumStats = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        _count: {
          select: {
            forumThreads: true,
            forumComments: true,
          },
        },
      },
    });

    const responseData = {
      profile,
      gameStats,
      materialProgress: {
        completed: completedCount,
        total: totalMaterials,
        percentage: progressPercentage,
      },
      chatLogs,
      forumStats: {
        threads: forumStats?._count.forumThreads || 0,
        comments: forumStats?._count.forumComments || 0,
      },
    };

    console.log('Successfully fetched student details for:', studentId);
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching student details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      error: 'Failed to fetch student details',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/teacher/students/:id/logs - Get chat logs for a specific student (kept for backward compatibility)
app.get('/api/teacher/students/:id/logs', authMiddleware, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'Teacher') {
      return res.status(403).json({ error: 'Forbidden - Only teachers can access this endpoint' });
    }

    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Verify the student exists and is actually a student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'Student') {
      return res.status(400).json({ error: 'User is not a student' });
    }

    // Fetch all chat logs for this student
    const logs = await prisma.chatLog.findMany({
      where: {
        userId: studentId,
      },
      select: {
        id: true,
        message: true,
        response: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    });

    res.json(logs);
  } catch (err) {
    console.error('Error fetching student logs:', err);
    res.status(500).json({ error: 'Failed to fetch student logs' });
  }
});

// AI Chatbot Proxy Endpoint
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const API_KEY = process.env.AI_CHATBOT_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: 'AI Chatbot API key not configured' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call Google Gemini API
    // The model name from the frontend is 'gemini-2.5-flash'
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    // System instruction to ensure responses are in Bahasa Melayu only
    const systemInstruction = `Anda adalah KP Bot, pembantu AI untuk pelajar Sains Komputer Tingkatan 4. 

PERATURAN PENTING:
1. KONTEKS: Hanya jawab soalan berkaitan topik pengaturcaraan Java yang terdapat dalam silabus sekolah. Jika pengguna bertanya tentang bahasa lain (seperti Python/C++) atau topik umum yang tidak berkaitan, tolak dengan sopan dan bimbing mereka semula ke Java.
2. BAHASA: Gunakan Bahasa Melayu (Malaysia) yang baku. Dilarang sama sekali menggunakan kosa kata Bahasa Indonesia.
   - JANGAN GUNA: 'unduh', 'tautan', 'berkas', 'gampang', 'bisa' (untuk maksud 'boleh').
   - GUNA: 'muat turun', 'pautan', 'fail', 'mudah', 'boleh'.
3. NADA: Sentiasa memberi galakan, membantu, dan sesuai untuk pelajar Tingkatan 4.`;

    // Prepend language instruction to user message for better consistency
    const messageWithInstruction = `Sila jawab dalam Bahasa Melayu SAHAJA. ${message}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: systemInstruction
          }]
        },
        contents: [{
          parts: [{
            text: messageWithInstruction
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to get response from AI',
        details: errorText
      });
    }

    const data = await response.json();

    // Extract the text from Gemini's response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    // Save the chat log to database
    try {
      await prisma.chatLog.create({
        data: {
          userId: req.user.id,
          message: message,
          response: text,
        },
      });
    } catch (logError) {
      // Log error but don't fail the request
      console.error('Error saving chat log:', logError);
    }

    res.json({ text });
  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

// Chat History API Routes

// GET /api/chat/history - Get user's chat history (individual entries, not grouped)
app.get('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all chat logs for the user, ordered by date (newest first)
    // Return individual entries, not grouped
    const chatLogs = await prisma.chatLog.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        message: true,
        response: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    });

    // Return individual chat log entries with their original createdAt dates
    res.json(chatLogs);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// GET /api/chat/conversation/:id - Get a specific chat log entry
app.get('/api/chat/conversation/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = parseInt(req.params.id, 10);

    if (isNaN(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    // Get the specific chat log entry
    const chatLog = await prisma.chatLog.findFirst({
      where: {
        id: chatId,
        userId: userId, // Ensure user owns this chat
      },
      select: {
        id: true,
        message: true,
        response: true,
        createdAt: true,
      },
    });

    if (!chatLog) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Format as conversation messages (single Q&A pair)
    const messages = [
      {
        role: 'user',
        text: chatLog.message,
        timestamp: chatLog.createdAt,
      },
    ];

    if (chatLog.response) {
      messages.push({
        role: 'gemini',
        text: chatLog.response,
        timestamp: chatLog.createdAt,
      });
    }

    res.json({ messages });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// DELETE /api/chat/history/:id - Delete a single chat history item (MUST come before /api/chat/history)
app.delete('/api/chat/history/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = parseInt(req.params.id, 10);

    if (isNaN(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    // Verify the chat belongs to the user before deleting
    const chatLog = await prisma.chatLog.findFirst({
      where: {
        id: chatId,
        userId: userId,
      },
    });

    if (!chatLog) {
      console.log(`Chat ${chatId} not found or unauthorized for user ${userId}`);
      return res.status(404).json({ error: 'Chat not found or unauthorized' });
    }

    console.log(`Deleting chat ${chatId} for user ${userId}`);

    // Delete the specific chat log permanently from database
    await prisma.chatLog.delete({
      where: {
        id: chatId,
      },
    });

    console.log(`Chat ${chatId} successfully deleted from database`);

    // Verify deletion by checking if it still exists
    const verifyDelete = await prisma.chatLog.findUnique({
      where: { id: chatId },
    });

    if (verifyDelete) {
      console.error(`WARNING: Chat ${chatId} still exists after deletion attempt!`);
      return res.status(500).json({ error: 'Failed to delete chat from database' });
    }

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (err) {
    console.error('Error deleting chat:', err);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// DELETE /api/chat/history - Delete all chat history for the current user
app.delete('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all chat logs for the user
    await prisma.chatLog.deleteMany({
      where: {
        userId: userId,
      },
    });

    res.json({ success: true, message: 'Chat history deleted successfully' });
  } catch (err) {
    console.error('Error deleting chat history:', err);
    res.status(500).json({ error: 'Failed to delete chat history' });
  }
});

// Student Material Progress API Routes

// GET /api/progress - Get all completed material IDs for the current user
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const progressRecords = await prisma.studentMaterialProgress.findMany({
      where: {
        studentId: userId,
        isCompleted: true,
      },
      select: {
        materialId: true,
      },
    });

    const completedMaterialIds = progressRecords.map((record) => String(record.materialId));
    res.json(completedMaterialIds);
  } catch (err) {
    console.error('Get progress error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/progress/toggle - Toggle completion status for a material
app.post('/api/progress/toggle', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ error: 'materialId is required' });
    }

    const materialIdNum = Number(materialId);
    if (!Number.isInteger(materialIdNum)) {
      return res.status(400).json({ error: 'Invalid materialId' });
    }

    // Check if material exists
    const material = await prisma.learningMaterial.findUnique({
      where: { id: materialIdNum },
    });

    if (!material) {
      return res.status(404).json({ error: 'Learning material not found' });
    }

    // Check if progress record exists
    const existingProgress = await prisma.studentMaterialProgress.findUnique({
      where: {
        studentId_materialId: {
          studentId: userId,
          materialId: materialIdNum,
        },
      },
    });

    let result;
    if (existingProgress) {
      // Toggle the completion status
      result = await prisma.studentMaterialProgress.update({
        where: {
          id: existingProgress.id,
        },
        data: {
          isCompleted: !existingProgress.isCompleted,
        },
      });
    } else {
      // Create new record with isCompleted = true
      result = await prisma.studentMaterialProgress.create({
        data: {
          studentId: userId,
          materialId: materialIdNum,
          isCompleted: true,
        },
      });
    }

    res.json({ materialId: String(result.materialId), isCompleted: result.isCompleted });
  } catch (err) {
    console.error('Toggle progress error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/badge - Get badge info for a user
app.get('/api/users/:id/badge', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const badge = await prisma.badge.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!badge) {
      // If no badge exists, check if user is a teacher and assign Teacher badge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user && user.role === 'Teacher') {
        // Create Teacher badge
        const newBadge = await prisma.badge.create({
          data: {
            userId: userId,
            badgeType: 'Teacher',
            score: null,
          },
        });
        return res.json(newBadge);
      }

      return res.status(404).json({ error: 'Badge not found' });
    }

    res.json(badge);
  } catch (err) {
    console.error('Error fetching badge:', err);
    res.status(500).json({ error: 'Failed to fetch badge' });
  }
});

// Initialize badges for all existing users on server start
async function initializeBadges() {
  try {
    console.log('Initializing badges for all users...');
    await updateAllBadges();
    console.log('Badge initialization complete');
  } catch (err) {
    console.error('Error initializing badges:', err);
  }
}

const port = process.env.PORT || 4000;
app.listen(port, async () => {
  console.log(`Server listening on http://localhost:${port}`);
  // Initialize badges on server start
  await initializeBadges();
});
