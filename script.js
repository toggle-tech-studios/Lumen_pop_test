const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 85;
const BOARD_OFFSET_X = 75;
const BOARD_OFFSET_Y = 320;

// All 7 Original Lumens
const LUMEN_CONFIGS = [
  { name: 'aether',  base: 0x0284c7, light: 0x38bdf8, shape: 'diamond', faceY: 3,  color: 0x38bdf8 },
  { name: 'verdant', base: 0x059669, light: 0x34d399, shape: 'droplet', faceY: 6,  color: 0x34d399 },
  { name: 'solar',   base: 0xd97706, light: 0xfbbf24, shape: 'star',    faceY: 2,  color: 0xfbbf24 },
  { name: 'cosmic',  base: 0x7c3aed, light: 0xc084fc, shape: 'round',   faceY: 0,  color: 0xc084fc },
  { name: 'blaze',   base: 0xbe123c, light: 0xf43f5e, shape: 'flame',   faceY: 7,  color: 0xf43f5e },
  { name: 'terra',   base: 0xc2410c, light: 0xf97316, shape: 'hexagon', faceY: 0,  color: 0xf97316 },
  { name: 'nova',    base: 0xbe185d, light: 0xf472b6, shape: 'heart',   faceY: -3, color: 0xf472b6 }
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

  generateAllDirectTextures(scene);

  scoreText = scene.add.text(330, 120, 'SCORE: 0', {
    fontSize: '36px',
    fontStyle: 'bold',
    color: '#FFFFFF'
  }).setOrigin(0.5);

  scene.add.text(330, 170, 'Connect 3 or more resting spirits to wake them', {
    fontSize: '18px',
    color: '#94A3B8'
  }).setOrigin(0.5);

  // Draw board background cells/grid frame
  drawBoardGrid(scene);

  lineLayer = scene.add.graphics();
  lineLayer.setDepth(10);

  spawnGrid(scene);

  scene.time.addEvent({
    delay: 1600,
    loop: true,
    callback: () => triggerRandomPeek(scene)
  });

  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

// Draws subtle dark rounded tile pockets behind each piece
function drawBoardGrid(scene) {
  const bgGraphics = scene.add.graphics();
  bgGraphics.setDepth(0);

  // Outer Board Shadow / Panel
  const boardW = GRID_COLS * TILE_SIZE + 24;
  const boardH = GRID_ROWS * TILE_SIZE + 24;
  const boardX = BOARD_OFFSET_X - 12;
  const boardY = BOARD_OFFSET_Y - 12;

  bgGraphics.fillStyle(0x0E1424, 0.85);
  bgGraphics.fillRoundedRect(boardX, boardY, boardW, boardH, 24);
  bgGraphics.lineStyle(2, 0x1E293B, 0.9);
  bgGraphics.strokeRoundedRect(boardX, boardY, boardW, boardH, 24);

  // Individual Cell Slots
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellX = BOARD_OFFSET_X + c * TILE_SIZE + 6;
      const cellY = BOARD_OFFSET_Y + r * TILE_SIZE + 6;
      const cellSize = TILE_SIZE - 12;

      bgGraphics.fillStyle(0x131D31, 0.7);
      bgGraphics.fillRoundedRect(cellX, cellY, cellSize, cellSize, 16);

      bgGraphics.lineStyle(1.5, 0x1E293B, 0.45);
      bgGraphics.strokeRoundedRect(cellX, cellY, cellSize, cellSize, 16);
    }
  }
}

// Directly draw textures scaled down to ~26-28px so they sit cleanly in their tile
function generateAllDirectTextures(scene) {
  LUMEN_CONFIGS.forEach(cfg => {
    drawSingleDirectTexture(scene, cfg, false); // closed eyes
    drawSingleDirectTexture(scene, cfg, true);  // open eyes
  });
}

function drawSingleDirectTexture(scene, cfg, isOpen) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const cx = 45;
  const cy = 45;

  g.fillStyle(cfg.light, 1);
  g.lineStyle(2.5, 0xFFFFFF, 0.95);

  if (cfg.shape === 'diamond') {
    g.beginPath();
    g.moveTo(cx, cy - 28);
    g.lineTo(cx + 26, cy);
    g.lineTo(cx, cy + 28);
    g.lineTo(cx - 26, cy);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'droplet') {
    g.beginPath();
    g.moveTo(cx, cy - 30);
    g.lineTo(cx + 25, cy + 8);
    g.arc(cx, cy + 8, 25, 0, Math.PI, false);
    g.lineTo(cx, cy - 30);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'star') {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const r = i % 2 === 0 ? 28 : 11;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'round') {
    g.fillCircle(cx, cy, 25);
    g.strokeCircle(cx, cy, 25);
  } else if (cfg.shape === 'flame') {
    g.beginPath();
    g.moveTo(cx, cy - 30);
    g.lineTo(cx + 25, cy - 8);
    g.lineTo(cx + 22, cy + 24);
    g.lineTo(cx - 22, cy + 24);
    g.lineTo(cx - 25, cy - 8);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'hexagon') {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * 26;
      const y = cy + Math.sin(a) * 26;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'heart') {
    g.fillCircle(cx - 11, cy - 9, 13);
    g.fillCircle(cx + 11, cy - 9, 13);
    g.fillTriangle(cx - 23, cy - 4, cx + 23, cy - 4, cx, cy + 26);
    g.strokeCircle(cx - 11, cy - 9, 13);
    g.strokeCircle(cx + 11, cy - 9, 13);
  }

  // Gloss Highlight
  g.fillStyle(0xFFFFFF, 0.45);
  g.fillEllipse(cx, cy - 13, 14, 6);

  // Rosy Cheeks
  g.fillStyle(0xFB7185, 0.75);
  g.fillEllipse(cx - 13, cy + cfg.faceY + 4, 4.5, 2.5);
  g.fillEllipse(cx + 13, cy + cfg.faceY + 4, 4.5, 2.5);

  // Eyes & Facial Expressions
  const faceY = cy + cfg.faceY;
  if (!isOpen) {
    g.lineStyle(2.5, 0x1E1B4B, 1);
    g.beginPath();
    g.moveTo(cx - 14, faceY - 2); g.lineTo(cx - 6, faceY - 2);
    g.moveTo(cx + 6, faceY - 2);  g.lineTo(cx + 14, faceY - 2);
    g.strokePath();

    g.beginPath();
    g.arc(cx, faceY + 3, 3, 0.2, Math.PI - 0.2, false);
    g.strokePath();
  } else {
    g.fillStyle(0x1E1B4B, 1);
    g.fillCircle(cx - 10, faceY - 2, 5.5);
    g.fillCircle(cx + 10, faceY - 2, 5.5);

    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(cx - 8, faceY - 3.5, 2);
    g.fillCircle(cx + 12, faceY - 3.5, 2);

    g.fillStyle(0x1E1B4B, 1);
    g.fillCircle(cx, faceY + 4, 3);
    g.fillStyle(0xF43F5E, 1);
    g.fillCircle(cx, faceY + 5, 1.5);
  }

  g.generateTexture(`${cfg.name}_${isOpen ? 'open' : 'closed'}`, 90, 90);
  g.destroy();
}

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

      if (dist < 36) {
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
