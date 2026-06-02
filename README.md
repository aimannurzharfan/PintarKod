# PintarKod

PintarKod is a gamified mobile learning application for Form 4 Computer Science students. It combines interactive debugging challenges with an AI-powered tutor to make learning to code engaging and accessible.

## Download

| Platform | Link |
|----------|------|
| Android APK | [Download latest build](https://expo.dev/accounts/nurzharfan/projects/PintarKod/builds/d57a6ccf-27a5-463b-883f-2f36d3ba7d4f) |

### Demo credentials (Teacher account)

```
Email:    teacher@pintarkod.com
Password: teacher123
```

> Students cannot self-register. Student accounts are created by the Teacher via the Dashboard.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo), TypeScript, Expo Router |
| Backend | Node.js, Express |
| Database | MySQL (Aiven Cloud) |
| ORM | Prisma |
| Auth | JWT |
| AI | Google Gemini API |

---

## Local setup

### Prerequisites

- Node.js 18+
- npm 9+
- A running MySQL database (local or cloud, e.g. Aiven)

### 1. Clone

```bash
git clone https://github.com/aimannurzharfan/PintarKod.git
cd PintarKod
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in every value:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@host:port/dbname` |
| `JWT_SECRET` | Random secret for signing JWTs — generate with `openssl rand -hex 32` |
| `AI_CHATBOT_API_KEY` | Google Gemini API key |
| `PORT` | Port for the Express server (default: `4000`) |

### 4. Set up the database

Generate the Prisma client:

```bash
npx prisma generate
```

Apply migrations (creates all tables):

```bash
npx prisma migrate deploy
```

Seed initial data (optional):

```bash
npm run db:seed
```

### 5. Start the backend

```bash
npm run start:server
# equivalent: node server/index.js  (listens on PORT, default 4000)
```

### 6. Start the mobile app

```bash
npx expo start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

> **Emulator shortcut:** `npm run start:emu` sets the API URL to `http://10.0.2.2:4000` automatically.

---

## Key features

- **Debugging Challenges** — find and fix the buggy line in randomly generated code snippets
- **Build-a-Code** — assemble code blocks in the correct order
- **Logic Puzzles** — predict the output of short programs
- **Leaderboard & Badges** — Champion / Rising Star / Student tiers based on score ranking
- **AI Chatbot Tutor** — Google Gemini answers coding questions in real time
- **Community Forum** — threads, replies, image attachments, teacher moderation
- **Learning Materials** — teachers upload notes, videos, and exercises per topic
- **Notifications** — in-app alerts for new threads, replies, and materials

---

## Project structure

```
.
├── app/              # Expo Router screens
├── components/       # Shared UI components
├── constants/        # Theme and shared constants
├── contexts/         # React context providers
├── hooks/            # Custom hooks
├── i18n/             # Translations
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── server/
│   ├── index.js      # Express API (all routes)
│   ├── gameGenerator.js
│   └── buildCodeGenerator.js
├── docs/             # Scratch notes and SQL snippets (not required to run)
├── .env.example      # Copy to .env and fill in values
└── README.md
```

---

## Cloud deployment notes

The backend is hosted on Render Free Tier. The file system is ephemeral — uploaded files (avatars, forum attachments) are lost on restart. For production, replace local file storage with persistent object storage (e.g. AWS S3 or Cloudflare R2).
