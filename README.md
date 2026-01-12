# Welcome to PintarKod

This is a full-stack mobile learning application built with **React Native (Expo)** and a **Node.js (Express)** backend.

---

## Pre-requisites

Before you begin, ensure you have the following tools installed on your system. These are required to run the app successfully.

- **Node.js (v18 or higher, LTS recommended)**  
  [Download Node.js](https://nodejs.org/en)

- **MySQL Server & Workbench (v8.0 or higher)**  
  [Download MySQL](https://dev.mysql.com/downloads/workbench/)

- **Android Studio (Required for Android Emulator)**  
  [Download Android Studio](https://developer.android.com/studio)

---

## Quick Start: How to Run

Follow these steps exactly to get the project running without errors.

---

## 1. Get the Code

Clone this repository to your local machine:

```bash
git clone <your-repo-url>
cd PintarKod
```

---

## 2. Install Dependencies

Install all required packages for both backend and frontend. 

> [!IMPORTANT]
> **Crucial Step**: You must run the `prisma generate` command immediately after installing to configure the database client for your system.

```bash
npm install
npx prisma generate
```

---

## 3. Set Up Your Environment (.env)

This is the most important step for database connectivity.

Create a file named **`.env`** in the project root. Copy the content below and **update the password**:

```env
# Database Connection
# REPLACE 'YOUR_MYSQL_PASSWORD_HERE' WITH YOUR ACTUAL ROOT PASSWORD
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD_HERE@localhost:3306/pintarkod"

# AI Chatbot API Key
AI_CHATBOT_API_KEY="YOUR_SECRET_KEY_GOES_HERE"
```

---

## 4. Create the Database

Open **MySQL Workbench** and run this SQL command to create the empty database:

```sql
CREATE DATABASE pintarkod;
```

---

## 5. Sync the Database

Push the schema structure into your newly created database:

```bash
npx prisma db push
```

---

## 6. Seed the Database (Creates Teacher Account)

You **must** run this command to populate the database with initial data, including the default login account:

```bash
npm run db:seed
```

---

## 7. Run the Project

You need to run the backend and frontend in parallel. Open **two separate terminals**.

### Terminal 1 - Start Backend Server
This runs the Express API on port 4000.

```bash
npm run start:server
```

> **Note**: If you see `Server listening on http://localhost:4000`, it's working!

### Terminal 2 - Start Frontend (Expo)
This launches the Expo development app.

```bash
npm run start
```

---

## Default Login

Use these credentials to log in to the app after seeding the database:

- **Username:** `teacher`  
- **Password:** `teacher123`

---

## Troubleshooting

- **`ERR_INVALID_PACKAGE_CONFIG`**: If you see this error, it means the Prisma client wasn't generated correctly. Run `npx prisma generate` to fix it.
- **`P1001: Can't reach database server`**: Double-check your `.env` password and make sure MySQL Server is running.

---

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
