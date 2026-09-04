// --- AUDIO SYSTEM & SOUND EFFECTS ---

function initAudio(scene) {
  // 1. Initialize Web Audio Context for Procedural SFX
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }

  // 2. Play the MP3 Background Music (only once)
  if (!bgmMusic) {
    bgmMusic = scene.sound.add('gameplayBgm', { loop: true, volume: 0.6 });
    bgmMusic.play();
  }
}

// --- MP3 AUDIO DUCKING LOGIC ---
function duckMusicVolume(duration) {
  if (!bgmMusic || !bgmMusic.isPlaying || !mainScene) return;
  
  // Stop any current fading and instantly drop volume to 15%
  mainScene.tweens.killTweensOf(bgmMusic);
  bgmMusic.setVolume(0.15); 
  
  // Fade smoothly back to 60% after the sound effect finishes
  mainScene.tweens.add({
    targets: bgmMusic,
    volume: 0.6,
    delay: duration * 1000, 
    duration: 400,
    ease: 'Linear'
  });
}

// --- PROCEDURAL SOUND EFFECTS ---
function playLinkSound(comboLength) {
  if (!audioCtx) return;
  duckMusicVolume(0.2); // Duck MP3 for the link sound

  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'sine';
  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; 
  osc.frequency.setValueAtTime(notes[Math.min(comboLength - 1, notes.length - 1)], audioCtx.currentTime);
  
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.3);
}

function playPopSound() {
  if (!audioCtx) return;
  duckMusicVolume(0.4); // Duck MP3 for the pop burst!

  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'triangle';
  
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2); 
  
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.2);
}

function playBounceSound() {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'sine';
  
  osc.frequency.setValueAtTime(150, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.1);
}
