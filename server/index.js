const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer storage for avatars
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = (req.params.username || 'user').replace(/[^a-zA-Z0-9-_]/g, '_');
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${safe}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

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

// Upload/update avatar
app.put('/api/users/:username/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Invalid username' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Missing avatar file' });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const publicUrl = `/uploads/${path.basename(file.path)}`;
    const updated = await prisma.user.update({ where: { username }, data: { avatarUrl: publicUrl } });
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
