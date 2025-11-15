# Sound Files

This directory should contain the following sound files for the debugging game:

- `correct.mp3` - Plays when the answer is correct
- `wrong.mp3` - Plays when the answer is incorrect

## Quick Setup

**The app works perfectly without these files!** They are optional enhancements. If you want to add sounds:

### Option 1: Quick Download (Recommended)

1. Visit **Mixkit** (free, no login required):
   - https://mixkit.co/free-sound-effects/correct/
   - https://mixkit.co/free-sound-effects/error/

2. Click the download button on any sound you like
3. Rename the files to `correct.mp3` and `wrong.mp3`
4. Place them in this `assets/sounds/` directory

### Option 2: Direct Links

**Correct Sound:**
- https://mixkit.co/free-sound-effects/correct/
  - Look for "Correct Answer Tone" or similar
  - Download and rename to `correct.mp3`

**Wrong Sound:**
- https://mixkit.co/free-sound-effects/error/
  - Look for "Wrong Answer" or "Fail Notification"
  - Download and rename to `wrong.mp3`

### Option 3: Other Free Sources

1. **Pixabay** - https://pixabay.com/sound-effects/
   - Search "success" or "correct" for correct.mp3
   - Search "error" or "wrong" for wrong.mp3
   - Free, no attribution required

2. **Freesound.org** - https://freesound.org
   - Requires free account
   - Extensive library of free sounds

3. **Zapsplat** - https://www.zapsplat.com
   - Free after registration
   - Professional quality sounds

## Recommended Sound Types

- **correct.mp3**: 
  - Pleasant chime, success ding, or positive notification
  - Duration: 0.5-1 second
  - Tone: High-pitched, pleasant

- **wrong.mp3**: 
  - Error beep, buzzer, or negative notification
  - Duration: 0.5-1 second
  - Tone: Lower-pitched, attention-grabbing

## File Requirements

- **Format:** MP3
- **Sample Rate:** 44100 Hz (recommended)
- **Bitrate:** 128 kbps or higher
- **Duration:** 0.5-2 seconds (keep it short)
- **Volume:** Normalized (not too loud or too quiet)

## Testing

After adding the files, test them by:
1. Running the app: `npm run start:dev`
2. Navigate to Games → Debugging Challenge
3. Submit an answer (correct or incorrect)
4. You should hear the sound effects!

## Note

✅ **The app works perfectly without these files!** If the sound files are missing or fail to load, the game will continue to function normally - it just won't play sounds. No errors will occur.

