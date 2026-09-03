const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 85;
const BOARD_OFFSET_X = 75;
const BOARD_OFFSET_Y = 320;

// Complete data for the 7 Living Lumens
const LUMEN_DATA = [
  { id: 0, name: 'aether',  base: '#0284c7', light: '#38bdf8', glow: '#7dd3fc', type: 'diamond', faceY: 5,  color: 0x38bdf8 },
  { id: 1, name: 'verdant', base: '#059669', light: '#34d399', glow: '#6ee7b7', type: 'droplet', faceY: 10, color: 0x34d399 },
  { id: 2, name: 'solar',   base: '#d97706', light: '#fbbf24', glow: '#fde68a', type: 'star',    faceY: 3,  color: 0xfbbf24 },
  { id: 3, name: 'cosmic',  base: '#7c3aed', light: '#c084fc', glow: '#e9d5ff', type: 'round',   faceY: 0,  color: 0xc084fc },
  { id: 4, name: 'blaze',   base: '#be123c', light: '#f43f5e', glow: '#fda4af', type: 'flame',   faceY: 12, color: 0xf43f5e },
  { id: 5, name: 'terra',   base: '#c2410c', light: '#f97316', glow: '#fdba74', type: 'hexagon', faceY: 0,  color: 0xf97316 },
  { id: 6, name: 'nova',    base: '#be185d', light: '#f472b6', glow: '#fbcfe8', type: 'heart',   faceY: -5, color: 0xf472b6 }
];

const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1000,
  backgroundColor: '#0A0D1A',
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
let scoreText;
let isAnimating = false;

function create() {
  const scene = this;

  // 1. Procedurally generate all textures before anything else
  generateAllTextures(scene);

  scoreText = scene.add.text(330, 120, 'SCORE: 0', {
    fontSize: '36px',
    fontStyle: 'bold',
    color: '#FFFFFF'
  }).setOrigin(0.5);

  scene.add.text(330, 170, 'Connect 3 or more resting spirits to wake them', {
    fontSize: '18px',
    color: '#94A3B8'
  }).setOrigin(0.5);

  lineLayer = scene.add.graphics();
  lineLayer.setDepth(10);

  spawnGrid(scene);

  // Global Blinking System: Triggers a "peek" every 1.5 seconds
  scene.time.addEvent({
    delay: 1500,
    loop: true,
    callback: () => triggerRandomPeek(scene)
  });

  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

// --- PROCEDURAL TEXTURE GENERATION ---
function generateAllTextures(scene) {
  LUMEN_DATA.forEach(cfg => {
    createCanvasTexture(scene, cfg, false); // Closed state
    createCanvasTexture(scene, cfg, true);  // Open state
  });
}

function createCanvasTexture(scene, cfg, isOpen) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  const cx = 64;
  const cy = 64;

  ctx.save();
  ctx.clearRect(0, 0, 128, 128); 
  ctx.translate(cx, cy);

  ctx.shadowColor = cfg.glow;
  ctx.shadowBlur = 5;

  ctx.beginPath();
  if (cfg.type === 'diamond') {
    ctx.moveTo(0, -50);
    ctx.bezierCurveTo(46, -20, 48, 14, 0, 44);
    ctx.bezierCurveTo(-48, 14, -46, -20, 0, -50);
  } else if (cfg.type === 'droplet') {
    ctx.moveTo(0, -52);
    ctx.bezierCurveTo(46, -15, 48, 40, 0, 40);
    ctx.bezierCurveTo(-48, 40, -46, -15, 0, -52);
  } else if (cfg.type === 'star') {
    ctx.moveTo(0, -48);
    ctx.quadraticCurveTo(12, -12, 48, 0);
    ctx.quadraticCurveTo(12, 12, 0, 48);
    ctx.quadraticCurveTo(-12, 12, -48, 0);
    ctx.quadraticCurveTo(-12, -12, 0, -48);
  } else if (cfg.type === 'round') {
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
  } else if (cfg.type === 'flame') {
    ctx.moveTo(0, -50);
    ctx.bezierCurveTo(24, -30, 46, -15, 42, 22);
    ctx.bezierCurveTo(36, 44, -36, 44, -42, 22);
    ctx.bezierCurveTo(-46, -15, -24, -30, 0, -50);
  } else if (cfg.type === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * 44;
      const y = Math.sin(angle) * 44;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else if (cfg.type === 'heart') {
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(-50, -20, -35, -55, 0, -30);
    ctx.bezierCurveTo(35, -55, 50, -20, 0, 20);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -45, 0, 45);
  grad.addColorStop(0, cfg.light);
  grad.addColorStop(1, cfg.base);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.save();
  ctx.clip(); 

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -25, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, cfg.faceY);

  ctx.fillStyle = 'rgba(255, 110, 140, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-22, 10, 7, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(22, 10, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (!isOpen) {
    ctx.beginPath();
    if (cfg.name === 'solar' || cfg.name === 'terra') {
      ctx.moveTo(-22, -2); ctx.lineTo(-10, -2);
      ctx.moveTo(22, -2); ctx.lineTo(10, -2);
    } else if (cfg.name === 'cosmic' || cfg.name === 'nova') {
      ctx.arc(-16, 2, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.moveTo(9, 0); 
      ctx.arc(16, 2, 7, Math.PI * 1.1, Math.PI * 1.9);
    } else if (cfg.name === 'blaze') {
      ctx.moveTo(-22, -6); ctx.lineTo(-12, -1);
      ctx.moveTo(22, -6); ctx.lineTo(12, -1);
    } else {
      ctx.arc(-16, -4, 6, Math.PI * 0.1, Math.PI * 0.9);
      ctx.moveTo(22, -4);
      ctx.arc(16, -4, 6, Math.PI * 0.1, Math.PI * 0.9);
    }
    ctx.stroke();
  } else {
    [-16, 16].forEach(x => {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(x, -2, 8.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 2, -4.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 3, 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (cfg.name === 'blaze') {
      ctx.beginPath();
      ctx.moveTo(-22, -14); ctx.lineTo(-12, -11);
      ctx.moveTo(22, -14); ctx.lineTo(12, -11);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  
  if (!isOpen) {
    if (cfg.name === 'blaze' || cfg.name === 'solar') {
       ctx.moveTo(-3, 8); ctx.lineTo(3, 8);
       ctx.stroke();
    } else {
       ctx.arc(0, 6, 5, 0.1, Math.PI * 0.9);
       ctx.stroke();
    }
  } else {
    if (cfg.name === 'verdant' || cfg.name === 'nova') {
      ctx.arc(-4, 7, 4, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, 7, 4, 0, Math.PI);
      ctx.stroke();
    } else if (cfg.name === 'solar' || cfg.name === 'terra') {
      ctx.arc(0, 8, 7, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 11, 4, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.arc(0, 8, 5, 0, Math.PI);
      ctx.fill();
    }
  }

  ctx.restore(); 
  ctx.restore(); 

  // Inject the dynamically drawn canvas directly into Phaser's Texture Manager
  const textureKey = `${cfg.name}_${isOpen ? 'open' : 'closed'}`;
  scene.textures.addCanvas(textureKey, canvas);
}
// --- END PROCEDURAL TEXTURE GENERATION ---

function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_DATA.length - 1);
      const lumenData = LUMEN_DATA[type];
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      // Spawns using the procedurally generated texture
      const sprite = scene.add.image(x, y, `${lumenData.name}_closed`);

      const lumen = {
        sprite: sprite,
        type: type,
        name: lumenData.name,
        color: lumenData.color,
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
    y: lumen.baseY - 6,
    scaleX: 1.02,
    scaleY: 0.98,
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

    scene.time.delayedCall(200, () => {
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

  const activeColor = LUMEN_DATA[currentType].color;
  lineLayer.lineStyle(8, activeColor, 0.95);
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
    score += selectedLumens.length * 15;
    scoreText.setText('SCORE: ' + score);

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
      let type = Phaser.Math.Between(0, LUMEN_DATA.length - 1);
      let lumenData = LUMEN_DATA[type];

      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let startY = BOARD_OFFSET_Y - (i + 2) * TILE_SIZE;

      let sprite = scene.add.image(targetX, startY, `${lumenData.name}_closed`);

      const lumen = {
        sprite: sprite,
        type: type,
        name: lumenData.name,
        color: lumenData.color,
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
    
