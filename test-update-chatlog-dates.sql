-- SQL Script to Update ChatLog createdAt Dates for Testing
-- Run this in MySQL Workbench to set specific dates for testing chat history sorting

-- First, let's see the current ChatLog entries
SELECT id, message, createdAt, userId FROM ChatLog ORDER BY createdAt DESC;

-- Update the createdAt date for a message containing "apakah itu java"
-- Set it to November 16, 2025
UPDATE ChatLog 
SET createdAt = '2025-11-16 10:00:00'
WHERE message LIKE '%apakah itu java%' 
LIMIT 1;

-- Update the createdAt date for a message containing "tulis ringkasan java"
-- Set it to November 30, 2025 (newer date, should appear at top)
UPDATE ChatLog 
SET createdAt = '2025-11-30 10:00:00'
WHERE message LIKE '%tulis ringkasan java%' 
LIMIT 1;

-- Verify the updated dates
SELECT id, message, createdAt, userId 
FROM ChatLog 
WHERE message LIKE '%java%'
ORDER BY createdAt DESC;

-- Alternative: If you want to update by specific IDs
-- First find the IDs:
-- SELECT id, message, createdAt FROM ChatLog WHERE message LIKE '%java%';

-- Then update by ID:
-- UPDATE ChatLog SET createdAt = '2025-11-16 10:00:00' WHERE id = [YOUR_ID_HERE];
-- UPDATE ChatLog SET createdAt = '2025-11-30 10:00:00' WHERE id = [YOUR_ID_HERE];

