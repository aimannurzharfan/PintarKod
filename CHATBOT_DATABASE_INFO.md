# Chatbot Database Information

## Database Table: `ChatLog`

User prompts to the chatbot are stored in the **`ChatLog`** table in your MySQL database (`pintarkod`).

### Database Schema

The `ChatLog` table is defined in `prisma/schema.prisma`:

```prisma
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

### Table Structure

| Column     | Type      | Description                                    |
|------------|-----------|------------------------------------------------|
| `id`       | INT       | Primary key, auto-increment                    |
| `message`  | TEXT      | **The user's prompt/question to the chatbot**  |
| `response` | TEXT      | The AI chatbot's response (optional)           |
| `createdAt`| DATETIME  | Timestamp when the log was created             |
| `userId`   | INT       | Foreign key linking to the `User` table        |

### How Data is Saved

When a user sends a message to the chatbot:

1. **API Endpoint**: `POST /api/chat` (in `server/index.js` line 2128)
2. **Location**: ```2176:2182:server/index.js
await prisma.chatLog.create({
  data: {
    userId: req.user.id,
    message: message,
    response: text,
  },
});
```

### How to Query Chat Logs

#### Get all chat logs for a specific user:

```javascript
const chatLogs = await prisma.chatLog.findMany({
  where: {
    userId: studentId,
  },
  select: {
    id: true,
    message: true,      // User's prompt
    response: true,     // AI's response
    createdAt: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 50, // Limit to 50 most recent
});
```

#### API Endpoints Available:

1. **GET `/api/teacher/students/:id/logs`** - Get all chat logs for a student (for teachers)
   - Requires authentication
   - Teacher role only
   - Returns all chat logs for the specified student

2. **GET `/api/teacher/students/:id/details`** - Get detailed student info including chat logs
   - Requires authentication
   - Teacher role only
   - Returns last 50 chat logs along with other student stats

### Database Connection

To access the database directly:

1. **Database Name**: `pintarkod`
2. **Table Name**: `ChatLog`
3. **Connection**: Use your `DATABASE_URL` from `.env` file

### Example SQL Queries

#### View all chat logs:
```sql
SELECT * FROM ChatLog ORDER BY createdAt DESC;
```

#### View chat logs for a specific user:
```sql
SELECT 
  c.id,
  c.message,
  c.response,
  c.createdAt,
  u.username
FROM ChatLog c
JOIN User u ON c.userId = u.id
WHERE u.id = 1
ORDER BY c.createdAt DESC;
```

#### Count chat logs per user:
```sql
SELECT 
  u.username,
  COUNT(c.id) as chat_count
FROM User u
LEFT JOIN ChatLog c ON u.id = c.userId
GROUP BY u.id, u.username
ORDER BY chat_count DESC;
```

### Related Code Locations

- **Schema Definition**: `prisma/schema.prisma` (lines 133-143)
- **Save Chat Log**: `server/index.js` (lines 2174-2182)
- **Retrieve Chat Logs**: `server/index.js` (lines 2020-2034, 2105-2118)
- **Display Chat Logs**: `app/teacher/monitor/index.tsx` (teacher monitoring interface)

