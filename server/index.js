const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateRandomDebugChallenge } = require('./gameGenerator');

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
      whereClause.username = {
        contains: searchTerm,
      };
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

// Delete account by username
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Invalid username' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { username } });
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
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const thread = await prisma.forumThread.create({
      data: {
        title,
        content,
        authorId: authorIdNum,
        attachment: attachment && typeof attachment === 'string' ? attachment : null
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
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
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
      title,
      content
    };

    if (typeof attachment !== 'undefined') {
      data.attachment =
        attachment && typeof attachment === 'string' ? attachment : null;
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
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    const authorIdNum = Number(authorId);
    if (!Number.isInteger(authorIdNum)) {
      return res.status(400).json({ error: 'Valid authorId is required' });
    }

    const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const comment = await prisma.forumComment.create({
      data: {
        content,
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
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
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
      data: { content },
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

    // Generate a pool of challenges (more than needed to ensure variety)
    const challengePool = [];
    const poolSize = 30; // Generate 30 challenges to ensure variety
    
    for (let i = 0; i < poolSize; i++) {
      challengePool.push(generateRandomDebugChallenge());
    }

    // Fisher-Yates shuffle algorithm
    for (let i = challengePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [challengePool[i], challengePool[j]] = [challengePool[j], challengePool[i]];
    }

    // Take the first 10 unique challenges
    const challenges = challengePool.slice(0, 10);
    
    console.log('Generated', challenges.length, 'challenges');
    res.json(challenges); // Returns an array of 10 challenges
  } catch (err) {
    console.error('Error generating quiz:', err);
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

    // 'answers' is an array: [{ challenge, selectedLine }, ...]
    if (!Array.isArray(answers) || !totalTimeMs) {
      return res.status(400).json({ error: 'Invalid quiz submission' });
    }

    let totalScore = 0;
    let correctCount = 0;
    const timePerQuestion = totalTimeMs / answers.length;
    const feedback = []; // Array to store wrong answers

    for (const answer of answers) {
      const { challenge, selectedLine } = answer;
      const isCorrect = (challenge.buggyLineIndex === selectedLine);

      if (isCorrect) {
        correctCount++;
        // Calculate score for this *one* question
        const score = Math.max(100, challenge.basePoints - Math.floor(timePerQuestion / 100));
        totalScore += score;
      } else {
        // Add wrong answer to feedback array
        feedback.push({
          title: challenge.title[lang] || challenge.title.en || 'Challenge',
          explanation: challenge.explanation[lang] || challenge.explanation.en || 'No explanation available',
        });
      }
    }

    // Save ONE record for the entire quiz
    await prisma.gameScore.create({
      data: {
        userId: userId,
        score: totalScore,
        gameType: 'DEBUGGING_QUIZ'
      },
    });

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

// GET /api/leaderboard - Get top 50 users and current user's rank
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Get all scores grouped by userId with user information
    const scoresByUser = await prisma.gameScore.groupBy({
      by: ['userId'],
      _max: {
        score: true,
      },
    });

    // Sort by high score descending
    scoresByUser.sort((a, b) => (b._max.score || 0) - (a._max.score || 0));

    // Get user details for all users with scores
    const userIds = scoresByUser.map((item) => item.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,     // Explicitly select avatarUrl
        profileImage: true,  // Explicitly select profileImage
        role: true,
      },
    });

    // Debug: Log to verify image data is being fetched
    console.log('Leaderboard - Fetched users:', users.length);
    if (users.length > 0) {
      const sampleUser = users[0];
      console.log('Sample user data:', {
        username: sampleUser.username,
        hasAvatarUrl: !!sampleUser.avatarUrl,
        hasProfileImage: !!sampleUser.profileImage,
        avatarUrlLength: sampleUser.avatarUrl?.length || 0,
        profileImageLength: sampleUser.profileImage?.length || 0,
      });
    }

    // Create a map for quick user lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Build leaderboard array with top 50
    const leaderboard = scoresByUser.slice(0, 50).map((item, index) => {
      const user = userMap.get(item.userId);
      const entry = {
        rank: index + 1,
        userId: item.userId,
        username: user?.username || 'Unknown',
        avatarUrl: user?.avatarUrl || null,      // Explicitly include avatarUrl
        profileImage: user?.profileImage || null, // Explicitly include profileImage
        role: user?.role || 'Student',
        totalScore: item._max.score || 0,
      };
      
      // Debug: Log first entry to verify data
      if (index === 0) {
        console.log('First leaderboard entry:', {
          username: entry.username,
          hasAvatarUrl: !!entry.avatarUrl,
          hasProfileImage: !!entry.profileImage,
        });
      }
      
      return entry;
    });

    // Find current user's rank and score
    const currentUserIndex = scoresByUser.findIndex((item) => item.userId === currentUserId);
    let userRank = null;

    if (currentUserIndex !== -1) {
      const currentUserItem = scoresByUser[currentUserIndex];
      const currentUser = userMap.get(currentUserId);
      userRank = {
        rank: currentUserIndex + 1,
        userId: currentUserId,
        username: currentUser?.username || 'Unknown',
        avatarUrl: currentUser?.avatarUrl || null,
        profileImage: currentUser?.profileImage || null,
        role: currentUser?.role || 'Student',
        totalScore: currentUserItem._max.score || 0,
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
        };
      }
    }

    // Debug: Log final response structure
    console.log('Leaderboard response - entries:', leaderboard.length);
    if (leaderboard.length > 0) {
      console.log('First entry in response:', {
        username: leaderboard[0].username,
        hasAvatarUrl: !!leaderboard[0].avatarUrl,
        hasProfileImage: !!leaderboard[0].profileImage,
      });
    }
    if (userRank) {
      console.log('User rank in response:', {
        username: userRank.username,
        hasAvatarUrl: !!userRank.avatarUrl,
        hasProfileImage: !!userRank.profileImage,
      });
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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
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
    
    res.json({ text });
  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
