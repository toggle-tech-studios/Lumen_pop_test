// --- audio.js ---

let audioCtx = null;

// Initialize and unlock the audio context on the first user tap
function initAudio(scene) {
    // Tie into Phaser's existing audio context to respect iOS/Android autoplay rules
    if (scene && scene.sound && scene.sound.context) {
        audioCtx = scene.sound.context;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } else if (!audioCtx) {
        // Fallback safety
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
}

// Procedural sound effect for dragging over Lumens
function playLinkSound(scene) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    
    try {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        // Ascending magical pitch
        osc.frequency.setValueAtTime(600, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        // Failsafe to prevent game crashes if audio cannot play
        console.log("Audio play failed, ignoring.");
    }
}

// Procedural sound effect for popping a matched chain or using a booster
function playPopSound(scene) {
    if (!audioCtx || audioCtx.state !== 'running') return;

    try {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        
        osc.type = 'triangle';
        // Dropping pitch to simulate a bubble pop
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.log("Audio play failed, ignoring.");
    }
}
