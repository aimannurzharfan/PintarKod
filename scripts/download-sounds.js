#!/usr/bin/env node

/**
 * Script to download free sound effects for the debugging game
 * 
 * This script downloads free sound effects from freesound.org API
 * or uses direct download links from free sound libraries
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

// Ensure directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

/**
 * Download a file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

/**
 * Generate a simple beep sound using Web Audio API concepts
 * Note: This creates a simple tone file
 */
function generateSimpleTone(type, filepath) {
  // For actual implementation, you'd need a library like 'tone' or 'audio-generator'
  // For now, we'll use placeholder download URLs
  console.log(`Note: Cannot generate MP3 files directly. Please download ${type} sound manually.`);
}

async function main() {
  console.log('Downloading sound files for debugging game...\n');

  // Free sound URLs from Mixkit (royalty-free)
  const sounds = {
    correct: {
      url: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
      filename: 'correct.mp3'
    },
    wrong: {
      url: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
      filename: 'wrong.mp3'
    }
  };

  try {
    // Try downloading from Mixkit
    console.log('Attempting to download from Mixkit...\n');
    
    for (const [type, sound] of Object.entries(sounds)) {
      const filepath = path.join(soundsDir, sound.filename);
      
      try {
        await downloadFile(sound.url, filepath);
      } catch (error) {
        console.warn(`Failed to download ${sound.filename}:`, error.message);
        console.log(`\nPlease manually download ${sound.filename} from:`);
        console.log(`- Mixkit: https://mixkit.co/free-sound-effects/`);
        console.log(`- Freesound: https://freesound.org/\n`);
      }
    }
    
    console.log('\n✓ Sound download process completed!');
    console.log('If files are missing, please download them manually from:');
    console.log('- https://mixkit.co/free-sound-effects/');
    console.log('- https://freesound.org/');
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease manually download sound files:');
    console.log('1. Go to https://mixkit.co/free-sound-effects/');
    console.log('2. Search for "correct" and download correct.mp3');
    console.log('3. Search for "wrong" or "error" and download wrong.mp3');
    console.log('4. Place both files in assets/sounds/');
  }
}

main();

