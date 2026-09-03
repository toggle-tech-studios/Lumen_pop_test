const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 96;
const BOARD_OFFSET_X = 42;
const BOARD_OFFSET_Y = 320;

// All 7 Original Lumens
const LUMEN_CONFIGS = [
  { name: 'aether',  base: 0x0284c7, light: 0x38bdf8, shape: 'diamond', faceY: 2,  color: 0x38bdf8 },
  { name: 'verdant', base: 0x059669, light: 0x34d399, shape: 'droplet', faceY: 4,  color: 0x34d399 },
  { name: 'solar',   base: 0xd97706, light: 0xfbbf24, shape: 'star',    faceY: 1,  color: 0xfbbf24 },
  { name: 'cosmic',  base: 0x7c3aed, light: 0xc084fc, shape: 'round',   faceY: 0,  color: 0xc084fc },
  { name: 'blaze',   base: 0xbe123c, light: 0xf43f5e, shape: 'flame',   faceY: 5,  color: 0xf43f5e },
  { name: 'terra',   base: 0xc2410c, light: 0xf97316, shape: 'hexagon', faceY: 0,  color: 0xf97316 },
  { name: 'nova',    base: 0xbe185d, light: 0xf472b6, shape: 'heart',   faceY: -2, color: 0xf472b6 }
];

const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1060,
  backgroundColor: '#070A14',
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

// Gameplay Stats
let score = 0;
let movesRemaining = 25;
const TARGET_SCORE = 1500;
let scoreText, movesText;
let progressBar, starIcons = [];
let isAnimating = false;

function create() {
  const scene = this;

  generateAllDirectTextures(scene);
  buildUserInterface(scene);
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

// Builds the complete Header, Progress Tracker, and Bottom Utility Dock
function buildUserInterface(scene) {
  const ui = scene.add.graphics();
  ui.setDepth(5);

  // 1. Top Glass Header Card
  ui.fillStyle(0x0C1222, 0.9);
  ui.fillRoundedRect(30, 24, 600, 96, 20);
  ui.lineStyle(2, 0x1E2E4A, 0.9);
  ui.strokeRoundedRect(30, 24, 600, 96, 20);

  // Level Badge (Left)
  ui.fillStyle(0x1B253D, 1);
  ui.fillRoundedRect(44, 36, 110, 72, 14);
  scene.add.text(99, 56, 'LEVEL', { fontSize: '13px', fontStyle: 'bold', color: '#64748B' }).setOrigin(0.5).setDepth(6);
  scene.add.text(99, 82, '1', { fontSize: '26px', fontStyle: 'bold', color: '#38BDF8' }).setOrigin(0.5).setDepth(6);

  // Target Score (Middle)
  scene.add.text(260, 56, 'TARGET', { fontSize: '13px', fontStyle: 'bold', color: '#64748B' }).setOrigin(0.5).setDepth(6);
  scene.add.text(260, 82, `${TARGET_SCORE}`, { fontSize: '22px', fontStyle: 'bold', color: '#F1F5F9' }).setOrigin(0.5).setDepth(6);

  // Moves Left Badge (Right)
  ui.fillStyle(0x1B253D, 1);
  ui.fillRoundedRect(480, 36, 136, 72, 14);
  scene.add.text(548, 56, 'MOVES', { fontSize: '13px', fontStyle: 'bold', color: '#64748B' }).setOrigin(0.5).setDepth(6);
  movesText = scene.add.text(548, 82, `${movesRemaining}`, { fontSize: '26px', fontStyle: 'bold', color: '#F59E0B' }).setOrigin(0.5).setDepth(6);

  // 2. Score & Star Progress Bar Section
  scoreText = scene.add.text(48, 146, 'SCORE: 0', {
    fontSize: '20px',
    fontStyle: 'bold',
    color: '#E2E8F0'
  }).setDepth(6);

  // Progress Bar Background Track
  ui.fillStyle(0x131D31, 1);
  ui.fillRoundedRect(42, 180, 576, 20, 10);
  ui.lineStyle(1.5, 0x1E293B, 1);
  ui.strokeRoundedRect(42, 180, 576, 20, 10);

  // Dynamic Fill Layer
  progressBar = scene.add.graphics().setDepth(6);
  updateProgressBar(0);

  // 3 Star Milestone Anchors (33%, 66%, 100%)
  const starFractions = [0.33, 0.66, 1.0];
  starFractions.forEach((pct, idx) => {
    const starX = 42 + 576 * pct;
    const starY = 190;

    const starBg = scene.add.circle(starX, starY, 14, 0x1B253D).setStrokeStyle(2, 0x334155).setDepth(7);
    const starGlyph = scene.add.text(starX, starY - 1, '★', {
      fontSize: '15px',
      color: '#475569'
    }).setOrigin(0.5).setDepth(8);

    starIcons.push({ bg: starBg, text: starGlyph, unlocked: false, threshold: TARGET_SCORE * pct });
  });

  // 3. Bottom Utility & Booster Dock
  ui.fillStyle(0x0C1222, 0.9);
  ui.fillRoundedRect(42, 930, 576, 90, 20);
  ui.lineStyle(2, 0x1E2E4A, 0.9);
  ui.strokeRoundedRect(42, 930, 576, 90, 20);

  const boosterNames = ['SHUFFLE', 'BOMB', 'BURST'];
  boosterNames.forEach((label, i) => {
    const btnX = 110 + i * 175;
    const btnY = 975;

    ui.fillStyle(0x172238, 1);
    ui.fillRoundedRect(btnX - 65, btnY - 30, 130, 60, 14);
    ui.lineStyle(1.5, 0x2A3B5C, 1);
    ui.strokeRoundedRect(btnX - 65, btnY - 30, 130, 60, 14);

    scene.add.text(btnX, btnY, label, {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#94A3B8'
    }).setOrigin(0.5).setDepth(6);
  });
}

function updateProgressBar(currentScore) {
  progressBar.clear();
  const fillWidth = Math.min(576, (currentScore / TARGET_SCORE) * 576);

  if (fillWidth > 0) {
    progressBar.fillStyle(0x38BDF8, 1);
    progressBar.fillRoundedRect(42, 180, fillWidth, 20, 10);
  }

  // Update Star Badges as Score Milestone is reached
  starIcons.forEach(star => {
    if (!star.unlocked && currentScore >= star.threshold) {
      star.unlocked = true;
      star.bg.setStrokeStyle(2, 0xFBBF24);
      star.text.setColor('#FBBF24');
    }
  });
}

function drawBoardGrid(scene) {
  const bg = scene.add.graphics();
  bg.setDepth(0);

  const boardW = GRID_COLS * TILE_SIZE + 20;
  const boardH = GRID_ROWS * TILE_SIZE + 20;
  const boardX = BOARD_OFFSET_X - 10;
  const boardY = BOARD_OFFSET_Y - 10;

  // Outer bezel frame
  bg.fillStyle(0x0C1222, 0.95);
  bg.fillRoundedRect(boardX, boardY, boardW, boardH, 20);
  bg.lineStyle(2, 0x1E293B, 1);
  bg.strokeRoundedRect(boardX, boardY, boardW, boardH, 20);

  // Individual separated grid boxes
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellGap = 7;
      const cellX = BOARD_OFFSET_X + c * TILE_SIZE + cellGap;
      const cellY = BOARD_OFFSET_Y + r * TILE_SIZE + cellGap;
      const cellSize = TILE_SIZE - (cellGap * 2);

      bg.fillStyle(0x11192E, 0.9);
      bg.fillRoundedRect(cellX, cellY, cellSize, cellSize, 14);

      bg.lineStyle(1.5, 0x1E2E4A, 0.85);
      bg.strokeRoundedRect(cellX, cellY, cellSize, cellSize, 14);
    }
  }
}

function generateAllDirectTextures(scene) {
  LUMEN_CONFIGS.forEach(cfg => {
    drawSingleDirectTexture(scene, cfg, false);
    drawSingleDirectTexture(scene, cfg, true);
  });
}

function drawSingleDirectTexture(scene, cfg, isOpen) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const cx = 35;
  const cy = 35;

  g.fillStyle(cfg.light, 1);
  g.lineStyle(2, 0xFFFFFF, 0.95);

  if (cfg.shape === 'diamond') {
    g.beginPath();
    g.moveTo(cx, cy - 20);
    g.lineTo(cx + 18, cy);
    g.lineTo(cx, cy + 20);
    g.lineTo(cx - 18, cy);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'droplet') {
    g.beginPath();
    g.moveTo(cx, cy - 22);
    g.lineTo(cx + 17, cy + 5);
    g.arc(cx, cy + 5, 17, 0, Math.PI, false);
    g.lineTo(cx, cy - 22);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'star') {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const r = i % 2 === 0 ? 20 : 8;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'round') {
    g.fillCircle(cx, cy, 18);
    g.strokeCircle(cx, cy, 18);
  } else if (cfg.shape === 'flame') {
    g.beginPath();
    g.moveTo(cx, cy - 21);
    g.lineTo(cx + 18, cy - 5);
    g.lineTo(cx + 15, cy + 17);
    g.lineTo(cx - 15, cy + 17);
    g.lineTo(cx - 18, cy - 5);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'hexagon') {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * 19;
      const y = cy + Math.sin(a) * 19;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (cfg.shape === 'heart') {
    g.fillCircle(cx - 8, cy - 6, 9);
    g.fillCircle(cx + 8, cy - 6, 9);
    g.fillTriangle(cx - 16, cy - 3, cx + 16, cy - 3, cx, cy + 18);
    g.strokeCircle(cx - 8, cy - 6, 9);
    g.strokeCircle(cx + 8, cy - 6, 9);
  }

  // Gloss Highlight
  g.fillStyle(0xFFFFFF, 0.45);
  g.fillEllipse(cx, cy - 9, 10, 4.5);

  // Rosy Cheeks
  g.fillStyle(0xFB7185, 0.75);
  g.fillEllipse(cx - 9, cy + cfg.faceY + 3, 3.5, 2);
  g.fillEllipse(cx + 9, cy + cfg.faceY + 3, 3.5, 2);

  // Facial features
  const faceY = cy + cfg.faceY;
  if (!isOpen) {
    g.lineStyle(2, 0x1E1B4B, 1);
    g.beginPath();
    g.moveTo(cx - 10, faceY - 1); g.lineTo(cx - 4, faceY - 1);
    g.moveTo(cx + 4, faceY - 1);  g.lineTo(cx + 10, faceY - 1);
    g.strokePath();

    g.beginPath();
    g.arc(cx, faceY + 2, 2.5, 0.2, Math.PI - 0.2, false);
    g.strokePath();
  } else {
    g.fillStyle(0x1E1B4B, 1);
    g.fillCircle(cx - 7, faceY - 1, 4);
    g.fillCircle(cx + 7, faceY - 1, 4);

    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(cx - 5.5, faceY - 2, 1.5);
    g.fillCircle(cx + 8.5, faceY - 2, 1.5);

    g.fillStyle(0x1E1B4B, 1);
    g.fillCircle(cx, faceY + 3, 2.2);
  }

  g.generateTexture(`${cfg.name}_${isOpen ? 'open' : 'closed'}`, 70, 70);
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
    y: lumen.baseY - 3,
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

      if (dist < 38) {
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
  lineLayer.lineStyle(7, activeColor, 0.95);
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

    // Deduct one move on valid match
    movesRemaining--;
    movesText.setText(`${movesRemaining}`);

    // Update score and smooth progress bar
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
