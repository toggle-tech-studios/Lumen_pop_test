const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 85;
const BOARD_OFFSET_X = 75;
const BOARD_OFFSET_Y = 320;

// All 7 Lumens with their corresponding line colors
const LUMEN_DATA = [
  { name: 'aether', color: 0x38bdf8 },  // Cyan
  { name: 'verdant', color: 0x34d399 }, // Green
  { name: 'solar', color: 0xfbbf24 },   // Gold
  { name: 'cosmic', color: 0xc084fc },  // Purple
  { name: 'blaze', color: 0xf43f5e },   // Red
  { name: 'terra', color: 0xf97316 },   // Orange
  { name: 'nova', color: 0xf472b6 }     // Pink
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
    preload: preload,
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

function preload() {
  // Load both Open and Closed states for all 7 Lumens
  LUMEN_DATA.forEach(lumen => {
    this.load.image(`${lumen.name}_open`, `assets/${lumen.name}_open.png`);
    this.load.image(`${lumen.name}_closed`, `assets/${lumen.name}_closed.png`);
  });
}

function create() {
  const scene = this;

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

  // Global Blinking System: Triggers a "peek" every 1 to 2.5 seconds
  scene.time.addEvent({
    delay: 1500,
    loop: true,
    callback: () => triggerRandomPeek(scene)
  });

  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_DATA.length - 1);
      const lumenData = LUMEN_DATA[type];
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      // Default state: Closed eyes (sleeping/resting)
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

// Organic float + slight squash/stretch for breathing effect
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

// Randomly picks a sleeping Lumen to quickly open its eyes, then go back to sleep
function triggerRandomPeek(scene) {
  if (isAnimating) return;

  const r = Phaser.Math.Between(0, GRID_ROWS - 1);
  const c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];

  if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) {
    // Wake up (Peek)
    lumen.sprite.setTexture(`${lumen.name}_open`);

    // Go back to sleep after 200ms
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
          // Undo last selection if dragging backward over previous Lumen
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
  
  // Wake up when touched!
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
  // Go back to sleep if un-selected
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

  // Match line color to the specific Lumen being dragged
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
    // If not a valid match, put them all back to sleep
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

      // New pieces fall in asleep
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
