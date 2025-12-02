-- Add notification preference flags to users
ALTER TABLE `User`
  ADD COLUMN `notifyNewForumThreads` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `notifyNewLearningMaterials` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `notifyForumReplies` TINYINT(1) NOT NULL DEFAULT 1;

-- Create notifications table
CREATE TABLE `Notification` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `type` ENUM('NEW_FORUM_THREAD','NEW_LEARNING_MATERIAL','FORUM_REPLY') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NULL,
  `data` JSON NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Notification_userId_createdAt_idx` (`userId`, `createdAt`),
  CONSTRAINT `Notification_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


