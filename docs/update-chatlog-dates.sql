-- SQL Script to Update ChatLog createdAt Dates
-- This will make each chat appear as a separate item in history (like Gemini)
-- Run this in MySQL Workbench after connecting to your pintarkod database

-- Step 1: View current ChatLog entries
SELECT id, message, createdAt, userId 
FROM ChatLog 
ORDER BY createdAt DESC 
LIMIT 20;

-- Step 2: Update dates for each chat log entry
-- Make sure each entry has a different date/time so they appear separately

-- Example: Update specific messages to have different dates
-- Replace the WHERE conditions with your actual messages

-- Update "apakah itu java" to November 16, 2025
UPDATE ChatLog 
SET createdAt = '2025-11-16 10:00:00'
WHERE message LIKE '%apakah itu java%' 
LIMIT 1;

-- Update "tulis ringkasan java" to November 30, 2025
UPDATE ChatLog 
SET createdAt = '2025-11-30 10:00:00'
WHERE message LIKE '%tulis ringkasan java%' 
LIMIT 1;

-- If you have more entries, update them with different dates:
-- UPDATE ChatLog SET createdAt = '2025-12-01 10:00:00' WHERE message LIKE '%your message%' LIMIT 1;
-- UPDATE ChatLog SET createdAt = '2025-12-02 10:00:00' WHERE message LIKE '%your message%' LIMIT 1;

-- Alternative: Update all existing ChatLog entries to have unique dates
-- This will spread them out over the past 30 days (newest at top)
-- WARNING: This will change ALL chat log dates - use with caution!

-- Step 3: Verify the updates
SELECT id, 
       LEFT(message, 50) as message_preview, 
       createdAt, 
       userId 
FROM ChatLog 
WHERE message LIKE '%java%'
ORDER BY createdAt DESC;

-- Step 4: Check all chat logs sorted by date (newest first)
SELECT id, 
       LEFT(message, 50) as message_preview, 
       createdAt 
FROM ChatLog 
ORDER BY createdAt DESC;

-- Optional: If you want to manually set dates for specific IDs:
-- First, find the IDs:
-- SELECT id, message, createdAt FROM ChatLog WHERE userId = YOUR_USER_ID ORDER BY createdAt DESC;

-- Then update by ID (replace YOUR_USER_ID and chat IDs):
-- UPDATE ChatLog SET createdAt = '2025-11-16 10:00:00' WHERE id = CHAT_ID_1 AND userId = YOUR_USER_ID;
-- UPDATE ChatLog SET createdAt = '2025-11-30 10:00:00' WHERE id = CHAT_ID_2 AND userId = YOUR_USER_ID;

