const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

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

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed
      }
    });

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
