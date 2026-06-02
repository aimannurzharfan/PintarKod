# Files That Use ChatLog

Here are all the files in the codebase that use or reference the ChatLog database table:

---

## 1. **`prisma/schema.prisma`** 
**Purpose**: Database schema definition

**Lines 26, 133-143**:
- Defines the `ChatLog` model structure
- Links `ChatLog` to `User` model via relation

```prisma
model User {
  ...
  chatLogs          ChatLog[]  // Line 26
  ...
}

model ChatLog {
  id        Int      @id @default(autoincrement())
  message   String   @db.Text // The student's prompt
  response  String?  @db.Text // Optional: The AI's answer
  createdAt DateTime @default(now())

  userId    Int
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

---

## 2. **`server/index.js`** 
**Purpose**: Backend API server - handles saving and retrieving chat logs

### **Saving Chat Logs** (Line 2176):
When a user sends a message to the chatbot via `/api/chat`:
```javascript
await prisma.chatLog.create({
  data: {
    userId: req.user.id,
    message: message,
    response: text,
  },
});
```

### **Retrieving Chat Logs for Teachers**:

**Line 1874, 1914**: Count chat logs for student statistics
```javascript
_count: {
  select: {
    chatLogs: true,
  },
}
```

**Line 2020-2034**: Get last 50 chat logs for a student (in `/api/teacher/students/:id/details`)
```javascript
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
```

**Line 2105-2118**: Get all chat logs for a student (in `/api/teacher/students/:id/logs`)
```javascript
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
    createdAt: 'desc',
  },
});
```

---

## 3. **`components/ai-chatbot.tsx`**
**Purpose**: Frontend chatbot component - sends messages to API

**Lines 58-114**: Handles sending messages to the chatbot API
- Sends user message to `/api/chat` endpoint
- The server automatically saves the chat log when this endpoint is called
- Does NOT directly access ChatLog - it's saved automatically by the server

```typescript
const handleSend = async () => {
  // Sends to /api/chat which saves to ChatLog
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message: currentInput
    })
  });
}
```

---

## 4. **`app/teacher/monitor/index.tsx`**
**Purpose**: Teacher monitoring interface - displays chat logs for students

### **Type Definition** (Lines 63-68):
```typescript
type ChatLog = {
  id: number;
  message: string;
  response: string | null;
  createdAt: string;
};
```

### **Usage**:
- **Line 35**: `chatLogsCount: number;` - Count of chat logs
- **Line 56**: `chatLogs: ChatLog[];` - Array of chat logs in student details
- **Lines 252-267**: Filter chat logs by date
```typescript
const getFilteredChatLogs = (): ChatLog[] => {
  if (selectedStudent === 'all') {
    return [];
  }
  if (!selectedDate) return studentDetails.chatLogs;
  
  const selectedDateObj = new Date(selectedDate);
  return studentDetails.chatLogs.filter(log => {
    const logDate = new Date(log.createdAt);
    return logDate.toDateString() === selectedDateObj.toDateString();
  });
};
```

- **Lines 713-724**: Display chat logs in the UI
```typescript
{getFilteredChatLogs().map((log) => (
  <View key={log.id} style={styles.chatLogItem}>
    <Text style={styles.chatLogDate}>{formatDate(log.createdAt)}</Text>
    <Text style={styles.chatLogMessage}>{log.message}</Text>
    {log.response && (
      <Text style={styles.chatLogResponse}>{log.response}</Text>
    )}
  </View>
))}
```

- **Lines 1197, 1204, 1209**: Style definitions for chat log display

---

## 5. **`app/mainpage.tsx`**
**Purpose**: Main page - contains the chatbot trigger

**Line 621**: Uses the AIChatbot component (which indirectly uses ChatLog via the API)
```typescript
<AIChatbot visible={showChatbot} onClose={() => setShowChatbot(false)} />
```

---

## 6. **`CHATBOT_DATABASE_INFO.md`** (Documentation)
**Purpose**: Documentation file I created to explain ChatLog structure

Contains information about:
- Database schema
- How data is saved
- How to query chat logs
- SQL examples

---

## Summary by Function

| File | Purpose | Type |
|------|---------|------|
| `prisma/schema.prisma` | Database schema definition | Schema |
| `server/index.js` | **Save** chat logs (POST), **Retrieve** chat logs (GET) | Backend API |
| `components/ai-chatbot.tsx` | Send messages to chatbot (triggers save) | Frontend Component |
| `app/teacher/monitor/index.tsx` | **Display** chat logs for teachers | Frontend Screen |
| `app/mainpage.tsx` | Contains chatbot trigger button | Frontend Screen |

---

## Data Flow

1. **User sends message** → `components/ai-chatbot.tsx`
2. **Frontend calls API** → `POST /api/chat` in `server/index.js`
3. **Server saves to database** → `prisma.chatLog.create()` saves to ChatLog table
4. **Teacher views logs** → `app/teacher/monitor/index.tsx` fetches and displays ChatLog data

---

## Database Table Name

- **Prisma Model**: `ChatLog` (PascalCase)
- **Database Table**: `ChatLog` (in MySQL database `pintarkod`)
- **Prisma Client**: `prisma.chatLog` (camelCase)

