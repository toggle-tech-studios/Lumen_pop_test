const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 96;
const BOARD_OFFSET_X = 42;
const BOARD_OFFSET_Y = 320;

// All 7 Original Lumens
const LUMEN_CONFIGS = [
  { name: 'aether',  base: '#0284c7', light: '#38bdf8', glow: '#7dd3fc', shape: 'diamond', faceY: 2,  color: 0x38bdf8 },
  { name: 'verdant', base: '#059669', light: '#34d399', glow: '#6ee7b7', shape: 'droplet', faceY: 5,  color: 0x34d399 },
  { name: 'solar',   base: '#d97706', light: '#fbbf24', glow: '#fde68a', shape: 'star',    faceY: 2,  color: 0xfbbf24 },
  { name: 'cosmic',  base: '#7c3aed', light: '#c084fc', glow: '#e9d5ff', shape: 'round',   faceY: 0,  color: 0xc084fc },
  { name: 'blaze',   base: '#be123c', light: '#f43f5e', glow: '#fda4af', shape: 'flame',   faceY: 7,  color: 0xf43f5e },
  { name: 'terra',   base: '#c2410c', light: '#f97316', glow: '#fdba74', shape: 'hexagon', faceY: 0,  color: 0xf97316 },
  { name: 'nova',    base: '#be185d', light: '#f472b6', glow: '#fbcfe8', shape: 'heart',   faceY: -3, color: 0xf472b6 }
];

const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1060,
  backgroundColor: '#090d16',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    create: create
  }
};

const game = new Phaser.Game(config);

let board = [];
let selectedLumens = [];
let isDragging = false;
let currentType = null;
let lineLayer;

let score = 0;
let movesRemaining = 25;
const TARGET_SCORE = 1500;
let scoreText, movesText;
let progressBar, starIcons = [];
let isAnimating = false;

function create() {
  const scene = this;

  // Hide the HTML loading text once the engine boots successfully
  const loadingElement = document.getElementById('loading');
  if (loadingElement) loadingElement.style.display = 'none';

  // 1. Draw the Kid-Friendly Background in memory
  generateBackgroundTexture(scene);
  scene.add.image(330, 530, 'bg').setDepth(-10);

  // 2. Generate perfect Lumen textures in memory
  generateAllCanvasTextures(scene);

  // 3. Build UI & Board Container
  buildUserInterface(scene);
  drawBoardGrid(scene);

  lineLayer = scene.add.graphics();
  lineLayer.setDepth(10);

  spawnGrid(scene);

  // Global Blinking System
  scene.time.addEvent({
    delay: 1600,
    loop: true,
    callback: () => triggerRandomPeek(scene)
  });

  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

// --- PROCEDURAL BACKGROUND GENERATOR (No image file needed!) ---
function generateBackgroundTexture(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 660;
  canvas.height = 1060;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Sky Gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#6d28d9');
  sky.addColorStop(0.3, '#d946ef');
  sky.addColorStop(0.7, '#f43f5e');
  sky.addColorStop(1, '#fbbf24');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 50;
  ctx.shadowColor = '#fef08a';
  ctx.beginPath();
  ctx.arc(w * 0.2, h * 0.25, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  function drawCloud(cx, cy, scale, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 40 * scale, cy - 20 * scale, 45 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 80 * scale, cy, 35 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 40 * scale, cy + 10 * scale, 30 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCloud(w * 0.5, h * 0.1, 1.5, 'rgba(253, 164, 175, 0.6)');
  drawCloud(-20, h * 0.2, 1.8, 'rgba(244, 165, 255, 0.5)');
  drawCloud(w * 0.7, h * 0.3, 1.2, 'rgba(254, 215, 170, 0.6)');
  drawCloud(w * 0.1, h * 0.35, 1.4, 'rgba(255, 255, 255, 0.4)');

  function drawHill(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, colorTop, colorBottom) {
    const grad = ctx.createLinearGradient(0, Math.min(y1, y2) - 50, 0, h);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x1, h);
    ctx.lineTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.lineTo(x2, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.stroke();
  }

  function drawTree(x, y, size, topColor) {
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.roundRect(x - size*0.1, y, size*0.2, size, 4);
    ctx.fill();
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.arc(x, y - size*0.2, size*0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - size*0.2, y - size*0.4, size*0.2, 0, Math.PI*2);
    ctx.fill();
  }

  // Hills & Trees
  drawHill(0, h * 0.45, w * 0.4, h * 0.35, w * 0.6, h * 0.55, w, h * 0.45, '#8b5cf6', '#4c1d95');
  drawTree(w*0.1, h*0.44, 30, '#38bdf8');
  drawTree(w*0.2, h*0.42, 25, '#34d399');
  drawTree(w*0.8, h*0.48, 35, '#f472b6');

  drawHill(-50, h * 0.55, w * 0.3, h * 0.65, w * 0.7, h * 0.45, w + 50, h * 0.55, '#f472b6', '#be185d');
  drawTree(w*0.85, h*0.52, 40, '#fbbf24');
  drawTree(w*0.75, h*0.55, 30, '#38bdf8');
  drawTree(w*0.15, h*0.58, 45, '#c084fc');

  drawHill(0, h * 0.7, w * 0.4, h * 0.65, w * 0.5, h * 0.85, w, h * 0.8, '#34d399', '#065f46');
  drawHill(-50, h * 0.9, w * 0.4, h * 0.8, w * 0.8, h * 0.95, w + 50, h * 0.85, '#10b981', '#064e3b');

  drawTree(w*0.1, h*0.75, 60, '#f43f5e');
  drawTree(w*0.25, h*0.85, 75, '#fbbf24');
  drawTree(w*0.9, h*0.82, 65, '#c084fc');
  drawTree(w*0.75, h*0.9, 50, '#38bdf8');

  // Sparkles
  for(let i=0; i<35; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const size = Math.random() * 8 + 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.quadraticCurveTo(sx, sy, sx + size, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + size);
    ctx.quadraticCurveTo(sx, sy, sx - size, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - size);
    ctx.fill();
  }

  // Load canvas into Phaser
  scene.textures.addCanvas('bg', canvas);
}

// --- FLAWLESS CANVAS LUMEN GENERATOR ---
function generateAllCanvasTextures(scene) {
  LUMEN_CONFIGS.forEach(cfg => {
    createCanvasTexture(scene, cfg, false);
    createCanvasTexture(scene, cfg, true);
  });
}

function createCanvasTexture(scene, cfg, isOpen) {
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  const cx = 45;
  const cy = 45;

  ctx.save();
  ctx.clearRect(0, 0, 90, 90); 
  ctx.translate(cx, cy);
  ctx.shadowColor = cfg.glow;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  if (cfg.shape === 'diamond') {
    ctx.moveTo(0, -32); ctx.bezierCurveTo(30, -14, 32, 10, 0, 30); ctx.bezierCurveTo(-32, 10, -30, -14, 0, -32);
  } else if (cfg.shape === 'droplet') {
    ctx.moveTo(0, -34); ctx.bezierCurveTo(30, -10, 32, 26, 0, 26); ctx.bezierCurveTo(-32, 26, -30, -10, 0, -34);
  } else if (cfg.shape === 'star') {
    ctx.moveTo(0, -32); ctx.quadraticCurveTo(8, -8, 32, 0); ctx.quadraticCurveTo(8, 8, 0, 32); ctx.quadraticCurveTo(-8, 8, -32, 0); ctx.quadraticCurveTo(-8, -8, 0, -32);
  } else if (cfg.shape === 'round') {
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
  } else if (cfg.shape === 'flame') {
    ctx.moveTo(0, -32); ctx.bezierCurveTo(16, -20, 30, -10, 28, 14); ctx.bezierCurveTo(24, 28, -24, 28, -28, 14); ctx.bezierCurveTo(-30, -10, -16, -20, 0, -32);
  } else if (cfg.shape === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * 28; const y = Math.sin(angle) * 28;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  } else if (cfg.shape === 'heart') {
    ctx.moveTo(0, 14); ctx.bezierCurveTo(-34, -14, -24, -38, 0, -20); ctx.bezierCurveTo(24, -38, 34, -14, 0, 14);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -30, 0, 30);
  grad.addColorStop(0, cfg.light);
  grad.addColorStop(1, cfg.base);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.save();
  ctx.clip(); 

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -16, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, cfg.faceY);

  ctx.fillStyle = 'rgba(255, 110, 140, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-14, 6, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(14, 6, 4.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (!isOpen) {
    ctx.beginPath();
    if (cfg.name === 'solar' || cfg.name === 'terra') {
      ctx.moveTo(-14, -1); ctx.lineTo(-6, -1); ctx.moveTo(14, -1); ctx.lineTo(6, -1);
    } else if (cfg.name === 'cosmic' || cfg.name === 'nova') {
      ctx.arc(-10, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(6, 0); ctx.arc(10, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9);
    } else if (cfg.name === 'blaze') {
      ctx.moveTo(-14, -4); ctx.lineTo(-8, -1); ctx.moveTo(14, -4); ctx.lineTo(8, -1);
    } else {
      ctx.arc(-10, -2, 4, Math.PI * 0.1, Math.PI * 0.9); ctx.moveTo(14, -2); ctx.arc(10, -2, 4, Math.PI * 0.1, Math.PI * 0.9);
    }
    ctx.stroke();
  } else {
    [-10, 10].forEach(x => {
      ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.arc(x, -1, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 1.5, -3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 2, 1, 1, 0, Math.PI * 2); ctx.fill();
    });
    if (cfg.name === 'blaze') {
      ctx.beginPath(); ctx.moveTo(-15, -9); ctx.lineTo(-7, -7); ctx.moveTo(15, -9); ctx.lineTo(7, -7); ctx.stroke();
    }
  }

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  if (!isOpen) {
    if (cfg.name === 'blaze' || cfg.name === 'solar') {
       ctx.moveTo(-2, 5); ctx.lineTo(2, 5); ctx.stroke();
    } else {
       ctx.arc(0, 4, 3, 0.1, Math.PI * 0.9); ctx.stroke();
    }
  } else {
    if (cfg.name === 'verdant' || cfg.name === 'nova') {
      ctx.arc(-2.5, 5, 2.5, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(2.5, 5, 2.5, 0, Math.PI); ctx.stroke();
    } else if (cfg.name === 'solar' || cfg.name === 'terra') {
      ctx.arc(0, 5, 4.5, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, Math.PI); ctx.fill();
    } else {
      ctx.arc(0, 5, 3.5, 0, Math.PI); ctx.fill();
    }
  }
  ctx.restore(); 
  ctx.restore(); 

  scene.textures.addCanvas(`${cfg.name}_${isOpen ? 'open' : 'closed'}`, canvas);
}


// --- KID-FRIENDLY UI ---
function buildUserInterface(scene) {
  const ui = scene.add.graphics();
  ui.setDepth(5);

  ui.fillStyle(0x4a044e, 0.9); 
  ui.fillRoundedRect(30, 24, 600, 96, 24);
  ui.lineStyle(3, 0xfbcfe8, 1);
  ui.strokeRoundedRect(30, 24, 600, 96, 24);

  ui.fillStyle(0x701a75, 1);
  ui.fillRoundedRect(44, 36, 110, 72, 16);
  scene.add.text(99, 56, 'LEVEL', { fontSize: '13px', fontStyle: 'bold', color: '#f9a8d4' }).setOrigin(0.5).setDepth(6);
  scene.add.text(99, 82, '1', { fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(6);

  scene.add.text(260, 56, 'TARGET', { fontSize: '13px', fontStyle: 'bold', color: '#f9a8d4' }).setOrigin(0.5).setDepth(6);
  scene.add.text(260, 82, `${TARGET_SCORE}`, { fontSize: '22px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5).setDepth(6);

  ui.fillStyle(0x701a75, 1);
  ui.fillRoundedRect(480, 36, 136, 72, 16);
  scene.add.text(548, 56, 'MOVES', { fontSize: '13px', fontStyle: 'bold', color: '#f9a8d4' }).setOrigin(0.5).setDepth(6);
  movesText = scene.add.text(548, 82, `${movesRemaining}`, { fontSize: '26px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5).setDepth(6);

  scoreText = scene.add.text(48, 146, 'SCORE: 0', { fontSize: '20px', fontStyle: 'bold', color: '#FFFFFF' }).setDepth(6);

  ui.fillStyle(0x4a044e, 0.9);
  ui.fillRoundedRect(42, 180, 576, 20, 10);
  ui.lineStyle(2, 0xfbcfe8, 1);
  ui.strokeRoundedRect(42, 180, 576, 20, 10);

  progressBar = scene.add.graphics().setDepth(6);
  updateProgressBar(0);

  const starFractions = [0.33, 0.66, 1.0];
  starFractions.forEach((pct) => {
    const starX = 42 + 576 * pct;
    const starY = 190;
    const starBg = scene.add.circle(starX, starY, 15, 0x701a75).setStrokeStyle(3, 0xfbcfe8).setDepth(7);
    const starGlyph = scene.add.text(starX, starY - 1, '★', { fontSize: '16px', color: '#fbcfe8' }).setOrigin(0.5).setDepth(8);
    starIcons.push({ bg: starBg, text: starGlyph, unlocked: false, threshold: TARGET_SCORE * pct });
  });

  ui.fillStyle(0x4a044e, 0.9);
  ui.fillRoundedRect(42, 930, 576, 90, 24);
  ui.lineStyle(3, 0xfbcfe8, 1);
  ui.strokeRoundedRect(42, 930, 576, 90, 24);

  const boosterNames = ['SHUFFLE', 'BOMB', 'BURST'];
  boosterNames.forEach((label, i) => {
    const btnX = 110 + i * 175;
    const btnY = 975;
    ui.fillStyle(0x701a75, 1);
    ui.fillRoundedRect(btnX - 65, btnY - 30, 130, 60, 16);
    ui.lineStyle(2, 0xf9a8d4, 1);
    ui.strokeRoundedRect(btnX - 65, btnY - 30, 130, 60, 16);
    scene.add.text(btnX, btnY, label, { fontSize: '15px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5).setDepth(6);
  });
}

function updateProgressBar(currentScore) {
  progressBar.clear();
  const fillWidth = Math.min(576, (currentScore / TARGET_SCORE) * 576);

  if (fillWidth > 0) {
    progressBar.fillStyle(0xFCD34D, 1); 
    progressBar.fillRoundedRect(42, 180, fillWidth, 20, 10);
  }

  starIcons.forEach(star => {
    if (!star.unlocked && currentScore >= star.threshold) {
      star.unlocked = true;
      star.bg.setFillStyle(0xFBBF24);
      star.bg.setStrokeStyle(3, 0xFFFFFF);
      star.text.setColor('#FFFFFF');
    }
  });
}

// --- PINK BOARD CONTAINER ---
function drawBoardGrid(scene) {
  const bg = scene.add.graphics();
  bg.setDepth(0);

  const boardW = GRID_COLS * TILE_SIZE + 24;
  const boardH = GRID_ROWS * TILE_SIZE + 24;
  const boardX = BOARD_OFFSET_X - 12;
  const boardY = BOARD_OFFSET_Y - 12;

  bg.fillStyle(0x4a044e, 0.85); 
  bg.fillRoundedRect(boardX, boardY, boardW, boardH, 24);
  bg.lineStyle(4, 0xfbcfe8, 1); 
  bg.strokeRoundedRect(boardX, boardY, boardW, boardH, 24);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellGap = 6;
      const cellX = BOARD_OFFSET_X + c * TILE_SIZE + cellGap;
      const cellY = BOARD_OFFSET_Y + r * TILE_SIZE + cellGap;
      const cellSize = TILE_SIZE - (cellGap * 2);

      bg.fillStyle(0xbe185d, 0.6); 
      bg.fillRoundedRect(cellX, cellY, cellSize, cellSize, 16);
      bg.lineStyle(2, 0xf472b6, 0.9); 
      bg.strokeRoundedRect(cellX, cellY, cellSize, cellSize, 16);
    }
  }
}

// --- CORE GAMEPLAY MECHANICS ---
function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1);
      const cfg = LUMEN_CONFIGS[type];
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      const sprite = scene.add.image(x, y, `${cfg.name}_closed`);
      sprite.setDepth(2);

      const lumen = {
        sprite: sprite,
        type: type,
        name: cfg.name,
        color: cfg.color,
        row: r,
        col: c,
        baseY: y,
        floatTween: null
      };

      startFloating(scene, lumen);
      board[r][c] = lumen;
    }
  }
}

function startFloating(scene, lumen) {
  if (lumen.floatTween) lumen.floatTween.stop();

  const randomDelay = Phaser.Math.Between(0, 1000);
  const randomDuration = Phaser.Math.Between(1500, 2000);

  lumen.floatTween = scene.tweens.add({
    targets: lumen.sprite,
    y: lumen.baseY - 4,
    scaleX: 1.03,
    scaleY: 0.97,
    duration: randomDuration,
    delay: randomDelay,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}

function triggerRandomPeek(scene) {
  if (isAnimating) return;

  const r = Phaser.Math.Between(0, GRID_ROWS - 1);
  const c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];

  if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) {
    lumen.sprite.setTexture(`${lumen.name}_open`);

    scene.time.delayedCall(220, () => {
      if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) {
        lumen.sprite.setTexture(`${lumen.name}_closed`);
      }
    });
  }
}

function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating) return;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);

      if (dist < 40) {
        if (!isDragging) {
          isDragging = true;
          currentType = lumen.type;
          addLumenToChain(scene, lumen);
        } else if (lumen.type === currentType) {
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            const removed = selectedLumens.pop();
            resetLumenVisual(scene, removed);
            drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            const last = selectedLumens[selectedLumens.length - 1];
            const rowDiff = Math.abs(last.row - lumen.row);
            const colDiff = Math.abs(last.col - lumen.col);

            if (rowDiff <= 1 && colDiff <= 1) {
              addLumenToChain(scene, lumen);
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

  scene.tweens.add({
    targets: lumen.sprite,
    scaleX: 1.25,
    scaleY: 1.25,
    duration: 120,
    ease: 'Back.easeOut'
  });

  drawLine();
}

function resetLumenVisual(scene, lumen) {
  lumen.sprite.setTexture(`${lumen.name}_closed`);

  scene.tweens.add({
    targets: lumen.sprite,
    scaleX: 1.0,
    scaleY: 1.0,
    duration: 120,
    ease: 'Quad.easeOut',
    onComplete: () => {
      if (lumen.floatTween) lumen.floatTween.resume();
    }
  });
}

function drawLine() {
  lineLayer.clear();
  if (selectedLumens.length < 2) return;

  const activeColor = LUMEN_CONFIGS[currentType].color;
  lineLayer.lineStyle(8, activeColor, 1);
  lineLayer.beginPath();
  lineLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);

  for (let i = 1; i < selectedLumens.length; i++) {
    lineLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
  }
  lineLayer.strokePath();
}

function endConnection(scene) {
  if (!isDragging) return;
  isDragging = false;
  lineLayer.clear();

  if (selectedLumens.length >= 3) {
    isAnimating = true;

    movesRemaining--;
    movesText.setText(`${movesRemaining}`);

    score += selectedLumens.length * 15;
    scoreText.setText(`SCORE: ${score}`);
    updateProgressBar(score);

    selectedLumens.forEach(lumen => {
      if (lumen.floatTween) lumen.floatTween.stop();

      scene.tweens.add({
        targets: lumen.sprite,
        scale: 0,
        alpha: 0,
        duration: 160,
        ease: 'Back.easeIn',
        onComplete: () => lumen.sprite.destroy()
      });
      board[lumen.row][lumen.col] = null;
    });

    scene.time.delayedCall(180, () => applyGravity(scene));
  } else {
    selectedLumens.forEach(lumen => resetLumenVisual(scene, lumen));
  }

  selectedLumens = [];
  currentType = null;
}

function applyGravity(scene) {
  let longestAnimation = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let emptySlots = 0;

    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (board[r][c] === null) {
        emptySlots++;
      } else if (emptySlots > 0) {
        let piece = board[r][c];
        let newRow = r + emptySlots;

        board[newRow][c] = piece;
        board[r][c] = null;
        piece.row = newRow;

        const targetY = BOARD_OFFSET_Y + newRow * TILE_SIZE + TILE_SIZE / 2;
        piece.baseY = targetY;

        if (piece.floatTween) piece.floatTween.stop();

        const duration = 220 + (emptySlots * 35);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite,
          y: targetY,
          duration: duration,
          ease: 'Bounce.easeOut',
          onComplete: () => startFloating(scene, piece)
        });
      }
    }

    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1);
      let cfg = LUMEN_CONFIGS[type];

      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let startY = BOARD_OFFSET_Y - (i + 2) * TILE_SIZE;

      let sprite = scene.add.image(targetX, startY, `${cfg.name}_closed`);
      sprite.setDepth(2);

      const lumen = {
        sprite: sprite,
        type: type,
        name: cfg.name,
        color: cfg.color,
        row: r,
        col: c,
        baseY: targetY,
        floatTween: null
      };

      board[r][c] = lumen;

      const duration = 300 + (i * 50);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: sprite,
        y: targetY,
        duration: duration,
        ease: 'Bounce.easeOut',
        onComplete: () => startFloating(scene, lumen)
      });
    }
  }

  scene.time.delayedCall(longestAnimation + 50, () => {
    isAnimating = false;
  });
}
