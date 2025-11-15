#!/usr/bin/env node

/**
 * Advanced sound download script with configurable sources
 * 
 * This script supports multiple download methods:
 * 1. Direct URL downloads (if URLs are public)
 * 2. API-based downloads (requires API keys)
 * 3. User-provided URLs
 * 
 * Usage:
 *   node scripts/download-sounds-advanced.js
 *   
 * Or with custom URLs:
 *   node scripts/download-sounds-advanced.js --correct-url <URL> --wrong-url <URL>
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    correctUrl: null,
    wrongUrl: null,
    apiKey: null,
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--correct-url' && args[i + 1]) {
      options.correctUrl = args[i + 1];
      i++;
    } else if (args[i] === '--wrong-url' && args[i + 1]) {
      options.wrongUrl = args[i + 1];
      i++;
    } else if (args[i] === '--api-key' && args[i + 1]) {
      options.apiKey = args[i + 1];
      i++;
    }
  }
  
  return options;
}

/**
 * Download file from URL
 */
function downloadFile(url, filepath, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
    };
    
    const file = fs.createWriteStream(filepath);
    
    const req = protocol.request(options, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        return downloadFile(response.headers.location, filepath, headers)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;
      
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r  Downloading: ${percent}%`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        process.stdout.write('\r');
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    });
    
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
    
    req.end();
  });
}

/**
 * Download from Freesound API (requires API key)
 */
async function downloadFromFreesound(query, filename, apiKey) {
  if (!apiKey) {
    throw new Error('Freesound API key required');
  }
  
  const searchUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&fields=id,name,download&filter=license:"Attribution 4.0"&page_size=1`;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'freesound.org',
      path: `/apiv2/search/text/?query=${encodeURIComponent(query)}&fields=id,name,download&filter=license:"Attribution 4.0"&page_size=1`,
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    };
    
    https.get(options, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.results && result.results.length > 0) {
            const soundUrl = result.results[0].download;
            const filepath = path.join(soundsDir, filename);
            downloadFile(soundUrl, filepath, {
              'Authorization': `Token ${apiKey}`,
            })
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error('No results found'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Try multiple download methods
 */
async function downloadSound(type, filename, options) {
  const filepath = path.join(soundsDir, filename);
  
  // Skip if file already exists
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    if (stats.size > 0) {
      console.log(`✓ ${filename} already exists, skipping...`);
      return true;
    }
  }
  
  const methods = [];
  
  // Method 1: User-provided URL
  if (type === 'correct' && options.correctUrl) {
    methods.push(() => downloadFile(options.correctUrl, filepath));
  } else if (type === 'wrong' && options.wrongUrl) {
    methods.push(() => downloadFile(options.wrongUrl, filepath));
  }
  
  // Method 2: Freesound API (if API key provided)
  if (options.apiKey) {
    const query = type === 'correct' ? 'success correct answer' : 'error wrong buzzer';
    methods.push(() => downloadFromFreesound(query, filename, options.apiKey));
  }
  
  // Method 3: Try common free sound CDNs (may fail due to access restrictions)
  const fallbackUrls = {
    correct: [
      'https://assets.mixkit.co/sfx/download/mixkit-correct-answer-tone-2870.mp3',
    ],
    wrong: [
      'https://assets.mixkit.co/sfx/download/mixkit-wrong-answer-fail-notification-946.mp3',
    ],
  };
  
  if (fallbackUrls[type]) {
    fallbackUrls[type].forEach(url => {
      methods.push(() => downloadFile(url, filepath));
    });
  }
  
  // Try each method
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`\nTrying method ${i + 1}/${methods.length} for ${filename}...`);
      await methods[i]();
      return true;
    } catch (error) {
      console.warn(`  Method ${i + 1} failed: ${error.message}`);
      if (i === methods.length - 1) {
        console.error(`✗ Failed to download ${filename} from all sources`);
        return false;
      }
    }
  }
  
  return false;
}

async function main() {
  const options = parseArgs();
  
  console.log('Advanced Sound Download Script\n');
  console.log('='.repeat(50));
  
  if (options.correctUrl || options.wrongUrl || options.apiKey) {
    console.log('Using provided options:');
    if (options.correctUrl) console.log(`  Correct URL: ${options.correctUrl}`);
    if (options.wrongUrl) console.log(`  Wrong URL: ${options.wrongUrl}`);
    if (options.apiKey) console.log(`  API Key: ${'*'.repeat(options.apiKey.length - 4)}${options.apiKey.slice(-4)}`);
  } else {
    console.log('No custom URLs or API key provided.');
    console.log('Trying public sources (may fail due to access restrictions)...');
  }
  
  console.log('\n');
  
  const results = {
    correct: await downloadSound('correct', 'correct.mp3', options),
    wrong: await downloadSound('wrong', 'wrong.mp3', options),
  };
  
  console.log('\n' + '='.repeat(50));
  
  if (results.correct && results.wrong) {
    console.log('✓ Successfully downloaded all sound files!');
  } else {
    console.log('\n⚠ Some files could not be downloaded automatically.');
    console.log('\nAlternative options:');
    console.log('\n1. Use the generate script (recommended):');
    console.log('   npm run generate-sounds');
    console.log('\n2. Manual download:');
    console.log('   Visit https://mixkit.co/free-sound-effects/');
    console.log('   Download and place files in assets/sounds/');
    console.log('\n3. Use this script with custom URLs:');
    console.log('   node scripts/download-sounds-advanced.js \\');
    console.log('     --correct-url <URL> \\');
    console.log('     --wrong-url <URL>');
    console.log('\n4. Use Freesound API (requires free account):');
    console.log('   Get API key from https://freesound.org/apiv2/apply/');
    console.log('   node scripts/download-sounds-advanced.js --api-key <KEY>');
  }
}

main().catch((error) => {
  console.error('\n✗ Error:', error.message);
  process.exit(1);
});

