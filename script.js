// --- 7x7 GRID SETTINGS ---
const GRID_ROWS = 7;
const GRID_COLS = 7;
const TILE_SIZE = 78;  
const BOARD_OFFSET_X = 57;
const BOARD_OFFSET_Y = 290;

const LUMEN_CONFIGS = [
  { name: 'aether',  base: '#0284c7', light: '#38bdf8', glow: '#bae6fd', shape: 'diamond', faceY: 2,  color: 0x38bdf8 },
  { name: 'verdant', base: '#059669', light: '#34d399', glow: '#a7f3d0', shape: 'droplet', faceY: 5,  color: 0x34d399 },
  { name: 'solar',   base: '#d97706', light: '#fbbf24', glow: '#fef08a', shape: 'star',    faceY: 2,  color: 0xfbbf24 },
  { name: 'cosmic',  base: '#7c3aed', light: '#c084fc', glow: '#e9d5ff', shape: 'round',   faceY: 0,  color: 0xc084fc },
  { name: 'blaze',   base: '#be123c', light: '#f43f5e', glow: '#fecdd3', shape: 'flame',   faceY: 7,  color: 0xf43f5e },
  { name: 'terra',   base: '#c2410c', light: '#f97316', glow: '#fed7aa', shape: 'hexagon', faceY: 0,  color: 0xf97316 },
  { name: 'nova',    base: '#be185d', light: '#f472b6', glow: '#fbcfe8', shape: 'heart',   faceY: -3, color: 0xf472b6 }
];

const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1100,
  backgroundColor: '#090d16',
  scale: { 
    // ENVELOP ensures no black bars on any device aspect ratio
    mode: Phaser.Scale.ENVELOP, 
    autoCenter: Phaser.Scale.CENTER_BOTH 
  },
  scene: { create: create }
};

const game = new Phaser.Game(config);

let board = [];
let selectedLumens = [];
let isDragging = false;
let currentType = null;
let currentDirection = null; // Forces straight lines
let lineLayer, lineGlowLayer, particlesLayer;
let score = 0, movesRemaining = 35;
const TARGET_SCORE = 3000;
let scoreText, movesText, progressBar, starIcons = [];
let isAnimating = false;
let boosterButtons = []; 

// --- NEW MAGICAL AUDIO ENGINE ---
let audioCtx;

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  
  // Soft, magical music-box arpeggio loop instead of static noise
  const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
  let noteIdx = 0;

  setInterval(() => {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = notes[noteIdx];
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
    
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 1.5);
    
    noteIdx = (noteIdx + 1) % notes.length;
  }, 600); // Plays a soft note every 0.6 seconds
}

function playLinkSound(comboLength) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine';
  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; 
  osc.frequency.setValueAtTime(notes[Math.min(comboLength - 1, notes.length - 1)], audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function playPopSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2); 
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playBounceSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'sine';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

// --- MAIN GAME SCENE ---
function create() {
  const scene = this;
  const loadingElement = document.getElementById('loading');
  if (loadingElement) loadingElement.style.display = 'none';

  generateKidFriendlyBackground(scene);
  generateParticleTexture(scene);
  generateBoosterIcons(scene);
  generateAllCanvasTextures(scene);

  scene.add.image(330, 550, 'bg').setDepth(-10);

  buildTopUI(scene);
  buildProgressBar(scene);
  buildBoosterDock(scene);
  drawPinkBoardGrid(scene);

  lineGlowLayer = scene.add.graphics().setDepth(9);
  lineLayer = scene.add.graphics().setDepth(10);
  particlesLayer = scene.add.group();

  spawnGrid(scene);
  updateScoreUI();

  scene.time.addEvent({ delay: 1800, loop: true, callback: () => triggerRandomPeek(scene) });

  scene.input.on('pointerdown', () => initAudio());
  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

// --- KID-FRIENDLY BACKGROUND & ASSETS ---
function generateKidFriendlyBackground(scene) {
  const canvas = document.createElement('canvas'); canvas.width = 660; canvas.height = 1100;
  const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
  
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#6d28d9'); sky.addColorStop(0.3, '#d946ef');
  sky.addColorStop(0.7, '#f43f5e'); sky.addColorStop(1, '#fbbf24');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.shadowBlur = 50; ctx.shadowColor = '#fef08a';
  ctx.beginPath(); ctx.arc(w * 0.2, h * 0.25, 70, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

  function drawCloud(cx, cy, scale, color) {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2); ctx.arc(cx + 40 * scale, cy - 20 * scale, 45 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 80 * scale, cy, 35 * scale, 0, Math.PI * 2); ctx.arc(cx + 40 * scale, cy + 10 * scale, 30 * scale, 0, Math.PI * 2); ctx.fill();
  }
  drawCloud(w * 0.5, h * 0.1, 1.5, 'rgba(253, 164, 175, 0.6)'); drawCloud(-20, h * 0.2, 1.8, 'rgba(244, 165, 255, 0.5)');
  drawCloud(w * 0.7, h * 0.3, 1.2, 'rgba(254, 215, 170, 0.6)'); drawCloud(w * 0.1, h * 0.35, 1.4, 'rgba(255, 255, 255, 0.4)');

  function drawHill(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, colorTop, colorBottom) {
    const grad = ctx.createLinearGradient(0, Math.min(y1, y2) - 50, 0, h);
    grad.addColorStop(0, colorTop); grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x1, h); ctx.lineTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2); ctx.lineTo(x2, h); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2); ctx.stroke();
  }

  function drawTree(x, y, size, topColor) {
    ctx.fillStyle = '#713f12'; ctx.beginPath(); ctx.roundRect(x - size*0.1, y, size*0.2, size, 4); ctx.fill();
    ctx.fillStyle = topColor; ctx.beginPath(); ctx.arc(x, y - size*0.2, size*0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(x - size*0.2, y - size*0.4, size*0.2, 0, Math.PI*2); ctx.fill();
  }

  drawHill(0, h * 0.45, w * 0.4, h * 0.35, w * 0.6, h * 0.55, w, h * 0.45, '#8b5cf6', '#4c1d95');
  drawTree(w*0.1, h*0.44, 30, '#38bdf8'); drawTree(w*0.8, h*0.48, 35, '#f472b6');
  drawHill(-50, h * 0.55, w * 0.3, h * 0.65, w * 0.7, h * 0.45, w + 50, h * 0.55, '#f472b6', '#be185d');
  drawTree(w*0.85, h*0.52, 40, '#fbbf24'); drawTree(w*0.15, h*0.58, 45, '#c084fc');
  drawHill(0, h * 0.7, w * 0.4, h * 0.65, w * 0.5, h * 0.85, w, h * 0.8, '#34d399', '#065f46');
  drawHill(-50, h * 0.9, w * 0.4, h * 0.8, w * 0.8, h * 0.95, w + 50, h * 0.85, '#10b981', '#064e3b');
  drawTree(w*0.1, h*0.75, 60, '#f43f5e'); drawTree(w*0.25, h*0.85, 75, '#fbbf24'); drawTree(w*0.9, h*0.82, 65, '#c084fc');
  
  scene.textures.addCanvas('bg', canvas);
}

function generateParticleTexture(scene) {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.8)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
  scene.textures.addCanvas('particle', canvas);
}

function generateAllCanvasTextures(scene) {
  LUMEN_CONFIGS.forEach(cfg => { createCanvasTexture(scene, cfg, false); createCanvasTexture(scene, cfg, true); });
}

function createCanvasTexture(scene, cfg, isOpen) {
  const canvas = document.createElement('canvas'); canvas.width = 78; canvas.height = 78;
  const ctx = canvas.getContext('2d');
  
  ctx.save(); ctx.translate(39, 39); ctx.scale(0.8, 0.8); 
  ctx.shadowColor = cfg.glow; ctx.shadowBlur = 8;
  ctx.beginPath();
  if (cfg.shape === 'diamond') { ctx.moveTo(0, -32); ctx.bezierCurveTo(30, -14, 32, 10, 0, 30); ctx.bezierCurveTo(-32, 10, -30, -14, 0, -32); }
  else if (cfg.shape === 'droplet') { ctx.moveTo(0, -34); ctx.bezierCurveTo(30, -10, 32, 26, 0, 26); ctx.bezierCurveTo(-32, 26, -30, -10, 0, -34); }
  else if (cfg.shape === 'star') { ctx.moveTo(0, -32); ctx.quadraticCurveTo(8, -8, 32, 0); ctx.quadraticCurveTo(8, 8, 0, 32); ctx.quadraticCurveTo(-8, 8, -32, 0); ctx.quadraticCurveTo(-8, -8, 0, -32); }
  else if (cfg.shape === 'round') { ctx.arc(0, 0, 26, 0, Math.PI * 2); }
  else if (cfg.shape === 'flame') { ctx.moveTo(0, -32); ctx.bezierCurveTo(16, -20, 30, -10, 28, 14); ctx.bezierCurveTo(24, 28, -24, 28, -28, 14); ctx.bezierCurveTo(-30, -10, -16, -20, 0, -32); }
  else if (cfg.shape === 'hexagon') { for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; const x = Math.cos(a) * 28; const y = Math.sin(a) * 28; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } }
  else if (cfg.shape === 'heart') { ctx.moveTo(0, 14); ctx.bezierCurveTo(-34, -14, -24, -38, 0, -20); ctx.bezierCurveTo(24, -38, 34, -14, 0, 14); }
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -30, 0, 30);
  grad.addColorStop(0, cfg.glow); grad.addColorStop(0.3, cfg.light); grad.addColorStop(1, cfg.base);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();

  ctx.shadowBlur = 0; ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.beginPath(); ctx.ellipse(0, -18, 18, 10, 0, 0, Math.PI * 2); ctx.fill();

  ctx.translate(0, cfg.faceY);
  ctx.fillStyle = 'rgba(255, 110, 140, 0.7)'; ctx.beginPath(); ctx.ellipse(-14, 6, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(14, 6, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#1A1025'; ctx.strokeStyle = '#1A1025'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!isOpen) { 
    ctx.beginPath();
    if (cfg.name === 'solar' || cfg.name === 'terra') { ctx.moveTo(-15, -1); ctx.lineTo(-7, -1); ctx.moveTo(15, -1); ctx.lineTo(7, -1); }
    else if (cfg.name === 'cosmic' || cfg.name === 'nova') { ctx.arc(-11, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(6, 0); ctx.arc(11, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9); }
    else if (cfg.name === 'blaze') { ctx.moveTo(-15, -4); ctx.lineTo(-9, -1); ctx.moveTo(15, -4); ctx.lineTo(9, -1); }
    else { ctx.arc(-11, -2, 4, Math.PI * 0.1, Math.PI * 0.9); ctx.moveTo(15, -2); ctx.arc(11, -2, 4, Math.PI * 0.1, Math.PI * 0.9); }
    ctx.stroke();
    ctx.beginPath();
    if (cfg.name === 'blaze' || cfg.name === 'solar') { ctx.moveTo(-3, 5); ctx.lineTo(3, 5); } else { ctx.arc(0, 4, 3, 0.1, Math.PI * 0.9); }
    ctx.stroke();
  } else { 
    [-11, 11].forEach(x => { ctx.fillStyle = '#1A1025'; ctx.beginPath(); ctx.arc(x, -1, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 1.5, -3, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x - 2, 1, 1, 0, Math.PI * 2); ctx.fill(); });
    if (cfg.name === 'blaze') { ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(-8, -7); ctx.moveTo(16, -9); ctx.lineTo(8, -7); ctx.stroke(); }
    ctx.fillStyle = '#1A1025'; ctx.beginPath();
    if (cfg.name === 'verdant' || cfg.name === 'nova') { ctx.arc(-3, 5, 3, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 5, 3, 0, Math.PI); ctx.stroke(); }
    else if (cfg.name === 'solar' || cfg.name === 'terra') { ctx.arc(0, 5, 4.5, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, Math.PI); ctx.fill(); }
    else { ctx.arc(0, 5, 3.5, 0, Math.PI); ctx.fill(); }
  }
  ctx.restore(); ctx.restore(); 
  scene.textures.addCanvas(`${cfg.name}_${isOpen ? 'open' : 'closed'}`, canvas);
}

// --- PINK THEME UI & BOARD ---
function buildTopUI(scene) {
  const ui = scene.add.graphics().setDepth(5);
  const drawPanel = (x, w, title, val, valColor) => {
    ui.fillStyle(0x701a75, 1); ui.fillRoundedRect(x, 40, w, 66, 16);
    scene.add.text(x + w/2, 58, title, { fontSize: '11px', fontStyle: 'bold', color: '#f9a8d4', letterSpacing: 1 }).setOrigin(0.5).setDepth(6);
    return scene.add.text(x + w/2, 82, val, { fontSize: '26px', fontStyle: 'bold', color: valColor }).setOrigin(0.5).setDepth(6);
  };
  ui.fillStyle(0x4a044e, 0.9); ui.fillRoundedRect(30, 24, 600, 96, 24);
  ui.lineStyle(3, 0xfbcfe8, 1); ui.strokeRoundedRect(30, 24, 600, 96, 24);

  drawPanel(44, 110, 'LEVEL', '1', '#FFFFFF');
  drawPanel(172, 316, 'TARGET', `${TARGET_SCORE}`, '#FFFFFF');
  movesText = drawPanel(504, 110, 'MOVES', `${movesRemaining}`, '#FCD34D');
}

function buildProgressBar(scene) {
  scoreText = scene.add.text(48, 128, 'SCORE: 0', { fontSize: '16px', fontStyle: 'bold', color: '#FFFFFF' }).setDepth(6);
  const ui = scene.add.graphics().setDepth(5);
  ui.fillStyle(0x4a044e, 0.9); ui.fillRoundedRect(42, 154, 576, 16, 8);
  ui.lineStyle(1.5, 0xfbcfe8, 1); ui.strokeRoundedRect(42, 154, 576, 16, 8);
  progressBar = scene.add.graphics().setDepth(6);
  
  [0.33, 0.66, 1.0].forEach((pct) => {
    const starX = 42 + 576 * pct, starY = 162;
    const starBg = scene.add.circle(starX, starY, 14, 0x701a75).setStrokeStyle(2, 0xfbcfe8).setDepth(7);
    const starGlyph = scene.add.text(starX, starY - 1, '★', { fontSize: '14px', color: '#fbcfe8' }).setOrigin(0.5).setDepth(8);
    starIcons.push({ bg: starBg, text: starGlyph, unlocked: false, threshold: TARGET_SCORE * pct, scene: scene });
  });
}

function updateScoreUI() {
  scoreText.setText(`SCORE: ${score}`);
  progressBar.clear();
  const fillWidth = Math.min(576, (score / TARGET_SCORE) * 576);
  if (fillWidth > 0) { progressBar.fillStyle(0xFCD34D, 1); progressBar.fillRoundedRect(42, 154, fillWidth, 16, 8); }

  starIcons.forEach(star => {
    if (!star.unlocked && score >= star.threshold) {
      star.unlocked = true;
      star.bg.setFillStyle(0xFBBF24).setStrokeStyle(2, 0xFFFFFF);
      star.text.setColor('#FFFFFF');
      star.scene.tweens.add({ targets: [star.bg, star.text], scale: 1.5, duration: 150, yoyo: true, ease: 'Back.easeOut' });
      createBurst(star.scene, star.bg.x, star.bg.y, 0xFBBF24, 6, 40);
    }
  });

  boosterButtons.forEach(btn => {
    const canAfford = score >= btn.cost;
    btn.gfx.setAlpha(canAfford ? 1 : 0.4); btn.icon.setAlpha(canAfford ? 1 : 0.4);
    btn.label.setAlpha(canAfford ? 1 : 0.4); btn.costText.setAlpha(canAfford ? 1 : 0.4);
    btn.canAfford = canAfford;
  });
}

function drawPinkBoardGrid(scene) {
  const bg = scene.add.graphics().setDepth(0);
  const boardW = GRID_COLS * TILE_SIZE + 16;
  const boardH = GRID_ROWS * TILE_SIZE + 16;
  const boardX = BOARD_OFFSET_X - 8;
  const boardY = BOARD_OFFSET_Y - 8;

  bg.fillStyle(0x4a044e, 0.85); bg.fillRoundedRect(boardX, boardY, boardW, boardH, 24);
  bg.lineStyle(4, 0xfbcfe8, 1); bg.strokeRoundedRect(boardX, boardY, boardW, boardH, 24);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const gap = 4;
      const cellX = BOARD_OFFSET_X + c * TILE_SIZE + gap;
      const cellY = BOARD_OFFSET_Y + r * TILE_SIZE + gap;
      const size = TILE_SIZE - (gap * 2);
      bg.fillStyle(0xbe185d, 0.6); bg.fillRoundedRect(cellX, cellY, size, size, 14);
      bg.lineStyle(2, 0xf472b6, 0.9); bg.strokeRoundedRect(cellX, cellY, size, size, 14);
    }
  }
}

// --- BOTTOM BOOSTERS ---
function generateBoosterIcons(scene) {
  let c1 = document.createElement('canvas'); c1.width = 40; c1.height = 40; let ctx1 = c1.getContext('2d');
  ctx1.strokeStyle = '#38BDF8'; ctx1.lineWidth = 4; ctx1.lineCap = 'round';
  ctx1.beginPath(); ctx1.arc(20, 20, 12, 0.5, Math.PI - 0.5); ctx1.stroke(); ctx1.beginPath(); ctx1.arc(20, 20, 12, Math.PI + 0.5, Math.PI * 2 - 0.5); ctx1.stroke();
  ctx1.fillStyle = '#38BDF8'; ctx1.beginPath(); ctx1.moveTo(35, 12); ctx1.lineTo(27, 8); ctx1.lineTo(31, 18); ctx1.fill(); ctx1.beginPath(); ctx1.moveTo(5, 28); ctx1.lineTo(13, 32); ctx1.lineTo(9, 22); ctx1.fill();
  scene.textures.addCanvas('icon_shuffle', c1);

  let c2 = document.createElement('canvas'); c2.width = 40; c2.height = 40; let ctx2 = c2.getContext('2d');
  ctx2.fillStyle = '#1A1025'; ctx2.strokeStyle = '#A855F7'; ctx2.lineWidth = 3;
  ctx2.beginPath(); ctx2.arc(18, 22, 12, 0, Math.PI*2); ctx2.fill(); ctx2.stroke();
  ctx2.strokeStyle = '#FFFFFF'; ctx2.beginPath(); ctx2.moveTo(25, 12); ctx2.quadraticCurveTo(28, 8, 32, 10); ctx2.stroke();
  ctx2.fillStyle = '#FBBF24'; ctx2.beginPath(); ctx2.arc(32, 10, 4, 0, Math.PI*2); ctx2.fill();
  scene.textures.addCanvas('icon_bomb', c2);

  let c3 = document.createElement('canvas'); c3.width = 40; c3.height = 40; let ctx3 = c3.getContext('2d');
  ctx3.fillStyle = '#F43F5E'; ctx3.beginPath();
  for (let i = 0; i < 12; i++) { const a = (Math.PI / 6) * i; const r = i % 2 === 0 ? 18 : 8; const x = 20 + Math.cos(a) * r; const y = 20 + Math.sin(a) * r; if(i===0) ctx3.moveTo(x,y); else ctx3.lineTo(x,y); }
  ctx3.fill(); ctx3.fillStyle = '#FBBF24'; ctx3.beginPath(); ctx3.arc(20, 20, 6, 0, Math.PI*2); ctx3.fill();
  scene.textures.addCanvas('icon_burst', c3);
}

function buildBoosterDock(scene) {
  const ui = scene.add.graphics().setDepth(5);
  ui.fillStyle(0x4a044e, 0.9); ui.fillRoundedRect(42, 940, 576, 96, 24);
  ui.lineStyle(3, 0xfbcfe8, 1); ui.strokeRoundedRect(42, 940, 576, 96, 24);

  const boosters = [ 
    { name: 'SHUFFLE', icon: 'icon_shuffle', cost: 200, action: () => applyShuffle(scene) }, 
    { name: 'BOMB', icon: 'icon_bomb', cost: 400, action: () => applyBomb(scene) }, 
    { name: 'BURST', icon: 'icon_burst', cost: 600, action: () => applyBurst(scene) } 
  ];

  boosters.forEach((b, i) => {
    const btnX = 138 + i * 192, btnY = 988;
    const btnZone = scene.add.zone(btnX, btnY, 150, 70).setInteractive({ useHandCursor: true }).setDepth(10);
    const btnGfx = scene.add.graphics().setDepth(6);
    
    const drawBtn = (isDown) => {
      btnGfx.clear(); btnGfx.fillStyle(isDown ? 0xbe185d : 0x701a75, 1); btnGfx.fillRoundedRect(btnX - 75, btnY - 35, 150, 70, 16);
      btnGfx.lineStyle(2, 0xf9a8d4, 1); btnGfx.strokeRoundedRect(btnX - 75, btnY - 35, 150, 70, 16);
    };
    drawBtn(false);

    const icon = scene.add.image(btnX - 45, btnY, b.icon).setDepth(7);
    const label = scene.add.text(btnX + 15, btnY - 8, b.name, { fontSize: '14px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5).setDepth(7);
    const costText = scene.add.text(btnX + 15, btnY + 12, `-${b.cost}`, { fontSize: '13px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5).setDepth(7);

    const btnState = { gfx: btnGfx, icon: icon, label: label, costText: costText, cost: b.cost, canAfford: false };
    boosterButtons.push(btnState);

    btnZone.on('pointerdown', () => { 
      initAudio(); 
      if(btnState.canAfford && !isAnimating) {
        drawBtn(true); scene.tweens.add({ targets: [icon, label, costText], scale: 0.9, duration: 80 }); 
      }
    });
    btnZone.on('pointerup', () => { 
      if(btnState.canAfford && !isAnimating) {
        drawBtn(false); scene.tweens.add({ targets: [icon, label, costText], scale: 1, duration: 80, ease: 'Back.easeOut' }); 
        b.action(); 
      }
    });
    btnZone.on('pointerout', () => { 
      if(btnState.canAfford) { drawBtn(false); scene.tweens.add({ targets: [icon, label, costText], scale: 1, duration: 80 }); }
    });
  });
}

function applyShuffle(scene) {
  score -= 200; updateScoreUI(); playPopSound();
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l) {
        l.type = Phaser.Math.Between(0, LUMEN_CONFIGS.length-1);
        l.name = LUMEN_CONFIGS[l.type].name; l.color = LUMEN_CONFIGS[l.type].color;
        l.sprite.setTexture(`${l.name}_closed`);
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 2, 20);
      }
    }
  }
  checkDeadlock(scene);
}

function applyBomb(scene) {
  isAnimating = true; score -= 400; updateScoreUI(); playPopSound();
  let tr = Phaser.Math.Between(1, GRID_ROWS-2); let tc = Phaser.Math.Between(1, GRID_COLS-2);
  for(let r=tr-1; r<=tr+1; r++){
    for(let c=tc-1; c<=tc+1; c++){
      let l = board[r][c];
      if(l) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

function applyBurst(scene) {
  isAnimating = true; score -= 600; updateScoreUI(); playPopSound();
  let targetType = Phaser.Math.Between(0, LUMEN_CONFIGS.length-1);
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l && l.type === targetType) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

// --- CORE GAMEPLAY & DEADLOCK LOGIC ---
function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1);
      const cfg = LUMEN_CONFIGS[type];
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      const sprite = scene.add.image(x, y, `${cfg.name}_closed`).setDepth(2);
      const lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: y, floatTween: null };
      startFloating(scene, lumen); board[r][c] = lumen;
    }
  }
  checkDeadlock(scene);
}

function checkDeadlock(scene) {
  // Scans board to ensure there is at least one straight line of 3 available
  const dirs = [[0,1], [1,0], [1,1], [1,-1]]; 
  let movesExist = false;

  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      const type = board[r][c].type;
      for(let [dr, dc] of dirs) {
        if(r + dr*2 < GRID_ROWS && r + dr*2 >= 0 && c + dc*2 < GRID_COLS && c + dc*2 >= 0) {
           if(board[r+dr][c+dc].type === type && board[r+dr*2][c+dc*2].type === type) {
              movesExist = true; break;
           }
        }
      }
      if(movesExist) break;
    }
    if(movesExist) break;
  }

  // If no moves exist, shuffle the board for free
  if(!movesExist) {
    scene.time.delayedCall(500, () => {
      score += 200; // Refund the shuffle cost temporarily
      applyShuffle(scene);
    });
  }
}

function startFloating(scene, lumen) {
  if (lumen.floatTween) lumen.floatTween.stop();
  lumen.floatTween = scene.tweens.add({
    targets: lumen.sprite, y: lumen.baseY - 4, scaleX: 1.02, scaleY: 0.98,
    duration: Phaser.Math.Between(1500, 2000), delay: Phaser.Math.Between(0, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
  });
}

function triggerRandomPeek(scene) {
  if (isAnimating) return;
  const r = Phaser.Math.Between(0, GRID_ROWS - 1), c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];
  if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) {
    lumen.sprite.setTexture(`${lumen.name}_open`);
    scene.time.delayedCall(200, () => { if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) lumen.sprite.setTexture(`${lumen.name}_closed`); });
  }
}

// --- STRAIGHT LINE CONNECTION LOGIC ---
function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating) return;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);
      if (dist < 38) { 
        if (!isDragging) {
          isDragging = true; currentType = lumen.type; currentDirection = null; addLumenToChain(scene, lumen);
        } else if (lumen.type === currentType) {
          
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            // Undo logic
            const removed = selectedLumens.pop(); 
            if(selectedLumens.length === 1) currentDirection = null; // Reset direction if back to 1
            resetLumenVisual(scene, removed); drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            // New connection logic (Enforce straight lines)
            const last = selectedLumens[selectedLumens.length - 1];
            const rowDiff = lumen.row - last.row;
            const colDiff = lumen.col - last.col;

            // Ensure it's an adjacent square
            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
              if (selectedLumens.length === 1) {
                // Lock in the direction on the second block
                currentDirection = { r: rowDiff, c: colDiff };
                addLumenToChain(scene, lumen);
              } else {
                // For 3rd block onwards, it MUST match the locked direction
                if (rowDiff === currentDirection.r && colDiff === currentDirection.c) {
                  addLumenToChain(scene, lumen);
                }
              }
            }
          }
        }
      }
    }
  }
}

function addLumenToChain(scene, lumen) {
  selectedLumens.push(lumen);
  if (lumen.floatTween) lumen.floatTween.pause();
  lumen.sprite.setTexture(`${lumen.name}_open`);
  
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.25, scaleY: 1.25, duration: 150, ease: 'Back.easeOut' });
  
  playLinkSound(selectedLumens.length); 
  createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, 3, 20);
  drawLine();
}

function resetLumenVisual(scene, lumen) {
  lumen.sprite.setTexture(`${lumen.name}_closed`);
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.0, scaleY: 1.0, duration: 150, ease: 'Quad.easeOut', onComplete: () => { if (lumen.floatTween) lumen.floatTween.resume(); } });
}

function drawLine() {
  lineLayer.clear(); lineGlowLayer.clear();
  if (selectedLumens.length < 2) return;
  const activeColor = LUMEN_CONFIGS[currentType].color;
  const intensity = Math.min(selectedLumens.length / 6, 1);

  lineGlowLayer.lineStyle(16 + (intensity * 4), activeColor, 0.4); lineGlowLayer.beginPath(); lineGlowLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);
  lineLayer.lineStyle(8 + (intensity * 2), 0xFFFFFF, 0.9); lineLayer.beginPath(); lineLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);

  for (let i = 1; i < selectedLumens.length; i++) {
    lineGlowLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
    lineLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
  }
  lineGlowLayer.strokePath(); lineLayer.strokePath();
}

function createBurst(scene, x, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'particle').setTint(color).setDepth(11).setScale(Math.random() * 0.8 + 0.4);
    const angle = Math.random() * Math.PI * 2, dist = Math.random() * power + (power * 0.5);
    scene.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0, scale: 0, duration: Math.random() * 300 + 300, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

function endConnection(scene) {
  if (!isDragging) return;
  isDragging = false; lineLayer.clear(); lineGlowLayer.clear(); currentDirection = null;

  if (selectedLumens.length >= 3) {
    isAnimating = true; movesRemaining--; movesText.setText(`${movesRemaining}`);
    score += selectedLumens.length * 25; updateScoreUI(); playPopSound(); 

    const combo = selectedLumens.length;
    // Reduced camera shake
    if (combo >= 4) scene.cameras.main.shake(100, 0.003);

    selectedLumens.forEach((lumen) => {
      if (lumen.floatTween) lumen.floatTween.stop();
      scene.tweens.add({
        targets: lumen.sprite, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true,
        onComplete: () => { createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, Math.min(6 + combo, 15), 60); lumen.sprite.destroy(); }
      });
      board[lumen.row][lumen.col] = null;
    });
    scene.time.delayedCall(200, () => applyGravity(scene));
  } else { selectedLumens.forEach(lumen => resetLumenVisual(scene, lumen)); }
  selectedLumens = []; currentType = null;
}

function applyGravity(scene) {
  let longestAnimation = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let emptySlots = 0;
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (board[r][c] === null) { emptySlots++; } 
      else if (emptySlots > 0) {
        let piece = board[r][c]; let newRow = r + emptySlots;
        board[newRow][c] = piece; board[r][c] = null; piece.row = newRow;
        const targetY = BOARD_OFFSET_Y + newRow * TILE_SIZE + TILE_SIZE / 2; piece.baseY = targetY;
        if (piece.floatTween) piece.floatTween.stop();

        const duration = 250 + (emptySlots * 40);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
          onComplete: () => { playBounceSound(); scene.tweens.add({ targets: piece.sprite, scaleX: 1.15, scaleY: 0.85, duration: 60, yoyo: true, onComplete: () => startFloating(scene, piece) }); }
        });
      }
    }

    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1); let cfg = LUMEN_CONFIGS[type];
      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2; let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let sprite = scene.add.image(targetX, BOARD_OFFSET_Y - (i + 1) * TILE_SIZE, `${cfg.name}_closed`).setDepth(2);
      let lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: targetY, floatTween: null };
      board[r][c] = lumen;

      const duration = 350 + (i * 60);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
        onComplete: () => { playBounceSound(); scene.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 0.85, duration: 60, yoyo: true, onComplete: () => startFloating(scene, lumen) }); }
      });
    }
  }
  
  scene.time.delayedCall(longestAnimation + 100, () => { 
    isAnimating = false; 
    checkDeadlock(scene); // Verify the board is playable after falling
  });
}
