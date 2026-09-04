// --- AUDIO SYSTEM & SOUND EFFECTS ---

function initAudio(scene) {
  // 1. Initialize Web Audio Context for Procedural SFX
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  
  // CRITICAL FIX: Force the browser to unlock our procedural audio
  if (audioCtx.state === 'suspended') {
     audioCtx.resume();
  }

  // 2. Play the MP3 Background Music (only once)
  if (!bgmMusic) {
    bgmMusic = scene.sound.add('gameplayBgm', { loop: true, volume: 0.6 });
    bgmMusic.play();
  }
}

// --- MP3 AUDIO DUCKING LOGIC ---
function duckMusicVolume(duration, dropTo = 0.15) {
  if (!bgmMusic || !bgmMusic.isPlaying || !mainScene) return;
  
  mainScene.tweens.killTweensOf(bgmMusic);
  bgmMusic.setVolume(dropTo); 
  
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
  if (audioCtx.state === 'suspended') audioCtx.resume(); // Safety net to ensure sound plays
  duckMusicVolume(0.2); 

  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'sine';
  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51]; 
  osc.frequency.setValueAtTime(notes[Math.min(comboLength - 1, notes.length - 1)], audioCtx.currentTime);
  
  // INCREASED VOLUME
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.3);
}

function playPopSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  duckMusicVolume(0.4); 

  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'triangle';
  
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2); 
  
  // INCREASED VOLUME
  gain.gain.setValueAtTime(0.7, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.2);
}

function playBounceSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain(); 
  osc.type = 'sine';
  
  osc.frequency.setValueAtTime(150, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.1);
  
  // INCREASED VOLUME
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gain); 
  gain.connect(audioCtx.destination); 
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.1);
}

// --- FUSION ORB SPECIAL EFFECTS ---
function playFusionChargeSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  duckMusicVolume(1.5, 0.05); // Duck the music almost completely during the charge

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';

  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 1.2);

  // INCREASED VOLUME
  gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 1.0);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

  osc.connect(gain); 
  gain.connect(audioCtx.destination);
  osc.start(); 
  osc.stop(audioCtx.currentTime + 1.2);
}

function playFusionExplosionSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  // The Deep Boom
  const boomOsc = audioCtx.createOscillator();
  const boomGain = audioCtx.createGain();
  boomOsc.type = 'square';
  boomOsc.frequency.setValueAtTime(150, audioCtx.currentTime);
  boomOsc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6);

  // INCREASED VOLUME
  boomGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  boomGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

  boomOsc.connect(boomGain); 
  boomGain.connect(audioCtx.destination);
  boomOsc.start(); 
  boomOsc.stop(audioCtx.currentTime + 0.6);

  // The Magical Sparkles
  for(let i=0; i<3; i++) {
     setTimeout(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + (Math.random() * 400), audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.4);
        
        // INCREASED VOLUME
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        
        osc.connect(gain); 
        gain.connect(audioCtx.destination);
        osc.start(); 
        osc.stop(audioCtx.currentTime + 0.4);
     }, i * 120);
  }
}
