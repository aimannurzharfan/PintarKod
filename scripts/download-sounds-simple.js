#!/usr/bin/env node

/**
 * Simple script to download sound files from direct URLs
 * These are placeholder tones - replace with actual sound effects for better quality
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Direct download URLs from free sound libraries
// These are example URLs - you may need to update them if they expire
const soundUrls = {
  correct: [
    // Mixkit - correct answer tone (direct link)
    'https://assets.mixkit.co/sfx/download/mixkit-correct-answer-tone-2870.mp3',
    // Alternative: Pixabay
    'https://cdn.pixabay.com/download/audio/2022/03/10/audio_6e0b6c0e0d.mp3?filename=success-sound-effect-7652.mp3',
  ],
  wrong: [
    // Mixkit - wrong answer tone
    'https://assets.mixkit.co/sfx/download/mixkit-wrong-answer-fail-notification-946.mp3',
    // Alternative: Pixabay
    'https://cdn.pixabay.com/download/audio/2022/01/25/audio_9a6e8b0f1c.mp3?filename=error-126627.mp3',
  ]
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

async function downloadSound(type, urls, filename) {
  const filepath = path.join(soundsDir, filename);
  
  // Skip if file already exists
  if (fs.existsSync(filepath)) {
    console.log(`✓ ${filename} already exists, skipping...`);
    return true;
  }
  
  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`Attempting to download ${filename} from source ${i + 1}...`);
      await downloadFile(urls[i], filepath);
      return true;
    } catch (error) {
      console.warn(`  Failed: ${error.message}`);
      if (i === urls.length - 1) {
        console.error(`✗ Failed to download ${filename} from all sources`);
        return false;
      }
    }
  }
  return false;
}

async function main() {
  console.log('Downloading sound files...\n');
  
  const results = {
    correct: await downloadSound('correct', soundUrls.correct, 'correct.mp3'),
    wrong: await downloadSound('wrong', soundUrls.wrong, 'wrong.mp3'),
  };
  
  console.log('\n' + '='.repeat(50));
  
  if (results.correct && results.wrong) {
    console.log('✓ Successfully downloaded all sound files!');
  } else {
    console.log('\n⚠ Some files could not be downloaded automatically.');
    console.log('\nManual download options:');
    console.log('\n1. Mixkit (Recommended):');
    console.log('   https://mixkit.co/free-sound-effects/');
    console.log('   - Search for "correct" → download correct.mp3');
    console.log('   - Search for "wrong" or "error" → download wrong.mp3');
    console.log('\n2. Freesound.org:');
    console.log('   https://freesound.org/');
    console.log('   - Search and download suitable sounds');
    console.log('\n3. Pixabay:');
    console.log('   https://pixabay.com/sound-effects/');
    console.log('\nPlace downloaded files in: assets/sounds/');
  }
}

main().catch(console.error);

