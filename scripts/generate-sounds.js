#!/usr/bin/env node

/**
 * Generate simple tone sound files for the debugging game
 * 
 * This script generates WAV files with simple tones:
 * - correct.wav: Pleasant high-pitched success tone
 * - wrong.wav: Lower-pitched error tone
 * 
 * WAV files work perfectly with expo-av and don't require conversion
 */

const fs = require('fs');
const path = require('path');
const { WaveFile } = require('wavefile');

const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
const SAMPLE_RATE = 44100;
const DURATION = 0.6; // seconds

// Ensure directory exists
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

/**
 * Generate a sine wave tone
 */
function generateTone(frequency, duration, sampleRate, volume = 0.3) {
  const numSamples = Math.floor(duration * sampleRate);
  const samples = new Int16Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Generate sine wave with envelope for smooth attack/decay
    const envelope = Math.min(
      1,
      Math.min(t * 10, (duration - t) * 5) // Quick attack, slower decay
    );
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
    samples[i] = Math.round(sample * 32767);
  }
  
  return samples;
}

/**
 * Generate a chord (multiple frequencies)
 */
function generateChord(frequencies, duration, sampleRate, volume = 0.25) {
  const numSamples = Math.floor(duration * sampleRate);
  const samples = new Int16Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(
      1,
      Math.min(t * 10, (duration - t) * 5)
    );
    
    let sample = 0;
    frequencies.forEach((freq, index) => {
      // Slight phase offset for richer sound
      const phase = index * 0.1;
      sample += Math.sin(2 * Math.PI * freq * t + phase) * (volume / frequencies.length);
    });
    
    samples[i] = Math.round(sample * envelope * 32767);
  }
  
  return samples;
}

/**
 * Create WAV file from samples
 */
function createWavFile(samples, sampleRate, outputPath) {
  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, '16', samples);
  
  fs.writeFileSync(outputPath, wav.toBuffer());
  console.log(`✓ Generated: ${path.basename(outputPath)}`);
}

/**
 * Generate correct answer sound - pleasant high-pitched success tone
 */
function generateCorrectSound() {
  const outputPath = path.join(soundsDir, 'correct.wav');
  
  // Create a pleasant major chord (C-E-G) in higher octave
  const frequencies = [
    523.25, // C5
    659.25, // E5
    783.99, // G5
  ];
  
  // First part: quick ascending arpeggio
  const arpeggioDuration = 0.15;
  const arpeggioSamples = [];
  
  frequencies.forEach((freq, index) => {
    const delay = new Int16Array(Math.floor(index * arpeggioDuration * SAMPLE_RATE)).fill(0);
    const tone = generateTone(freq * 2, arpeggioDuration * 0.7, SAMPLE_RATE, 0.4);
    arpeggioSamples.push(Buffer.from(delay.buffer));
    arpeggioSamples.push(Buffer.from(tone.buffer));
  });
  
  // Second part: sustained chord
  const chordDuration = 0.3;
  const chordSamples = generateChord(frequencies, chordDuration, SAMPLE_RATE, 0.35);
  
  // Combine
  const allSamples = Buffer.concat([
    ...arpeggioSamples,
    Buffer.from(chordSamples.buffer)
  ]);
  
  // Convert back to Int16Array
  const finalSamples = new Int16Array(allSamples.buffer, 0, allSamples.length / 2);
  
  createWavFile(finalSamples, SAMPLE_RATE, outputPath);
}

/**
 * Generate wrong answer sound - lower-pitched error tone
 */
function generateWrongSound() {
  const outputPath = path.join(soundsDir, 'wrong.wav');
  
  // Create a dissonant minor second (clashing frequencies)
  const frequencies = [
    220.00, // A3
    233.08, // Bb3 (minor second - creates tension)
  ];
  
  // Add some harmonics for a buzzier sound
  const baseFreq = 110; // A2
  const buzzFrequencies = [
    baseFreq,
    baseFreq * 2,
    baseFreq * 3, // Add some odd harmonics for buzzer effect
  ];
  
  // Combine dissonant interval with buzzer harmonics
  const allFreqs = [...frequencies, ...buzzFrequencies.slice(1)]; // Skip duplicate
  
  const samples = generateChord(allFreqs, DURATION, SAMPLE_RATE, 0.4);
  createWavFile(samples, SAMPLE_RATE, outputPath);
}

/**
 * Copy WAV files to MP3 names (for compatibility)
 * Note: The app will try to load .mp3, but WAV works fine too
 */
function createSymlinks() {
  const correctWav = path.join(soundsDir, 'correct.wav');
  const wrongWav = path.join(soundsDir, 'wrong.wav');
  const correctMp3 = path.join(soundsDir, 'correct.mp3');
  const wrongMp3 = path.join(soundsDir, 'wrong.mp3');
  
  // On Windows, we'll copy instead of symlink
  if (fs.existsSync(correctWav)) {
    fs.copyFileSync(correctWav, correctMp3);
    console.log('✓ Created correct.mp3 (copy of correct.wav)');
  }
  
  if (fs.existsSync(wrongWav)) {
    fs.copyFileSync(wrongWav, wrongMp3);
    console.log('✓ Created wrong.mp3 (copy of wrong.wav)');
  }
}

function main() {
  console.log('Generating sound files for debugging game...\n');
  
  try {
    generateCorrectSound();
    generateWrongSound();
    
    // Also create MP3-named copies for compatibility
    // (The code tries to require .mp3 but WAV works too)
    console.log('\nCreating compatibility copies...');
    createSymlinks();
    
    console.log('\n✓ Successfully generated all sound files!');
    console.log('\nNote: Generated files are in WAV format (works perfectly with expo-av)');
    console.log('If you want actual MP3 files, you can convert them using:');
    console.log('  - Online: https://cloudconvert.com/wav-to-mp3');
    console.log('  - FFmpeg: ffmpeg -i correct.wav correct.mp3');
    
  } catch (error) {
    console.error('\n✗ Error generating sounds:', error.message);
    console.error('\nMake sure you have installed dependencies:');
    console.error('  npm install');
    process.exit(1);
  }
}

main();

