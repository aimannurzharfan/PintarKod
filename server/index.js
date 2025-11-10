const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const prisma = new PrismaClient();

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

    const { password: _pw, ...userSafe } = user;
    res.status(200).json({ user: userSafe });
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
        avatarUrl: true,
        profileImage: true,
        createdAt: true,
      },
    });

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
    select: { id: true, username: true, email: true }
  },
  comments: {
    include: {
      author: {
        select: { id: true, username: true, email: true }
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
    if (thread.authorId !== authorIdNum) {
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
        author: { select: { id: true, username: true, email: true } },
        thread: false
      }
    });
    await prisma.forumThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    });
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
        author: { select: { id: true, username: true, email: true } }
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
        author: { select: { id: true, username: true, email: true } }
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
