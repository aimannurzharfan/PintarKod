# Welcome to PintarKod

This is a full-stack mobile learning application built with React Native (Expo) and a Node.js (Express) backend.

---

## Pre-requisites

Before you begin, ensure you have the following tools installed on your system:

- **Node.js (v18 or higher, LTS recommended)**  
  https://nodejs.org/en

- **MySQL Server & Workbench (v8.0 or higher)**  
  https://dev.mysql.com/downloads/workbench/

- **Android Studio (Required for Android Emulator)**  
  https://developer.android.com/studio

---

## Quick Start: How to Run

Follow these steps exactly to get the project running.

---

## 1. Get the Code

Clone this repository to your local machine:

```bash
git clone <your-repo-url>
cd PintarKod
```

---

## 2. Install Dependencies

Install all required packages for both backend and frontend:

```bash
npm install
```

---

## 3. Set Up Your Environment (.env)

This is the most important step.

Create a file named **`.env`** in the project root, then paste and update these values:

```env
# Database Connection
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD_HERE@localhost:3306/pintarkod"

# AI Chatbot API Key
AI_CHATBOT_API_KEY="YOUR_SECRET_KEY_GOES_HERE"
```

---

## 4. Create the Database

Open MySQL Workbench and run:

```sql
CREATE DATABASE pintarkod;
```

---

## 5. Sync the Database

Push schema into the database:

```bash
npx prisma db push
```

---

## 6. Seed the Database (Creates Teacher Account)

You **must** do this to log in:

```bash
npm run db:seed
```

---

## 7. Run the Project

Open **two separate terminals**.

### Terminal 1 - Start Backend Server

```bash
npm run start:server
```

### Terminal 2 - Start Frontend (Expo)

```bash
npm run start
```

---

## Default Login

After seeding the database:

- **Username:** `teacher`  
- **Password:** `teacher123`

---

## Learn More

- Expo documentation:  
  https://docs.expo.dev/

- Learn Expo tutorial:  
  https://docs.expo.dev/tutorial/introduction/

---

## Join the Community

- Expo on GitHub:  
  https://github.com/expo/expo

- Discord Community:  
  https://chat.expo.dev
