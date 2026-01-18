# PintarKod
PintarKod is a gamified mobile learning application designed to help Form 4 Computer Science students master programming concepts. By combining interactive debugging challenges with an AI-powered tutor, PintarKod makes learning to code engaging and accessible.

## Download & Demo
The latest version of the application is available for Android.

- **Download APK**: [Download Android App (AAB)](https://expo.dev/artifacts/eas/fQCLUfY4BMHo76xH7roCVk.aab)
- **Live Backend**: https://pintarkod-api.onrender.com
- **Database**: Aiven Cloud (MySQL)

### Test Credentials
For evaluation purposes, use the following credentials to access the Teacher Dashboard and full feature set:

- **Email**: `teacher@pintarkod.com`
- **Password**: `teacher123`

> **Note**: Students cannot self-register. Student accounts must be created by the Teacher via the Dashboard.

## Key Features
- **AI Chatbot Tutor**: Integrated with Google Gemini API to answer coding questions in real-time.
- **Debugging Challenges**: Interactive code-fixing exercises to test logic and syntax skills.
- **Gamification System**: Experience points (XP), leaderboards, and progress tracking.
- **Community Forum**: A discussion platform for students to share knowledge.
- **Teacher Dashboard**: Dedicated interface for monitoring student progress and managing content.

## Technical Architecture

### Frontend (Mobile)
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Styling**: NativeWind (TailwindCSS)

### Backend (API)
- **Server**: Node.js & Express
- **Database**: MySQL (Hosted on Aiven)
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **AI Engine**: Google Gemini API

## Installation & Local Setup
To run this project locally for development or testing:

### 1. Clone the Repository
```bash
git clone https://github.com/nurzharfan/PintarKod.git
cd PintarKod
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following keys:

```env
DATABASE_URL="your_mysql_connection_string"
JWT_SECRET="your_secret_key"
AI_CHATBOT_API_KEY="your_google_gemini_key"
PORT=4000
```

### 4. Database Initialization
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Launch Application
Start the backend server:

```bash
npm run start:server
```

Start the mobile client:

```bash
npx expo start
```

## Cloud Storage Notice
> **Important**: This project is currently hosted on the Render Free Tier. The file system is ephemeral, meaning uploaded files (such as avatars or forum attachments) will not persist after a server restart. For a production environment, this would be replaced with persistent object storage (e.g., AWS S3).
