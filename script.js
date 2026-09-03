const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 85;
const BOARD_OFFSET_X = 75;
const BOARD_OFFSET_Y = 320;

// Configuration for 5 original, distinct Lumens
const LUMEN_CONFIGS = [
  { id: 0, name: 'Aether', color: 0x38BDF8, shape: 'diamond' },
  { id: 1, name: 'Verdant', color: 0x34D399, shape: 'hexagon' },
  { id: 2, name: 'Solar', color: 0xFBBF24, shape: 'star' },
  { id: 3, name: 'Cosmic', color: 0xA855F7, shape: 'teardrop' },
  { id: 4, name: 'Blaze', color: 0xF43F5E, shape: 'shield' }
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

  // Generate original vector textures for each Lumen shape
  generateLumenTextures(scene);

  scoreText = scene.add.text(330, 120, 'SCORE: 0', {
    fontSize: '36px',
    fontStyle: 'bold',
    color: '#FFFFFF'
  }).setOrigin(0.5);

  scene.add.text(330, 170, 'Connect 3 or more matching energy Lumens', {
    fontSize: '18px',
    color: '#94A3B8'
  }).setOrigin(0.5);

  lineLayer = scene.add.graphics();
  lineLayer.setDepth(10);

  spawnGrid(scene);

  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

// Procedurally draws original, polished Lumens with highlights and distinct shapes
function generateLumenTextures(scene) {
  LUMEN_CONFIGS.forEach(cfg => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const size = 32;

    // Outer Glow / Rim
    g.lineStyle(3, 0xFFFFFF, 0.9);
    g.fillStyle(cfg.color, 1);

    if (cfg.shape === 'diamond') {
      // 4-sided balanced diamond
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.85, 0);
      g.lineTo(0, size);
      g.lineTo(-size * 0.85, 0);
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (cfg.shape === 'hexagon') {
      // 6-sided geometric polygon
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = Math.cos(angle) * (size * 0.9);
        const hy = Math.sin(angle) * (size * 0.9);
        if (i === 0) g.moveTo(hx, hy);
        else g.lineTo(hx, hy);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (cfg.shape === 'star') {
      // 4-pointed sharp energy flare
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.3, -size * 0.3);
      g.lineTo(size, 0);
      g.lineTo(size * 0.3, size * 0.3);
      g.lineTo(0, size);
      g.lineTo(-size * 0.3, size * 0.3);
      g.lineTo(-size, 0);
      g.lineTo(-size * 0.3, -size * 0.3);
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (cfg.shape === 'teardrop') {
      // Pointed droplet
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.8, size * 0.3);
      g.arc(0, size * 0.3, size * 0.8, 0, Math.PI, false);
      g.lineTo(0, -size);
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (cfg.shape === 'shield') {
      // Downward-pointing prism / shield
      g.beginPath();
      g.moveTo(-size * 0.85, -size * 0.7);
      g.lineTo(size * 0.85, -size * 0.7);
      g.lineTo(size * 0.7, size * 0.2);
      g.lineTo(0, size);
      g.lineTo(-size * 0.7, size * 0.2);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // Inner bright energy core highlight
    g.fillStyle(0xFFFFFF, 0.45);
    g.fillCircle(0, 0, size * 0.32);

    g.generateTexture(`lumen_${cfg.id}`, 74, 74);
    g.destroy();
  });
}

function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1);
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      const sprite = scene.add.image(x, y, `lumen_${type}`);

      board[r][c] = {
        sprite: sprite,
        type: type,
        row: r,
        col: c
      };
    }
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
          addLumenToChain(lumen);
        } else if (lumen.type === currentType) {
          // Allow backtracking/undo
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            const removed = selectedLumens.pop();
            removed.sprite.setScale(1.0);
            drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            const last = selectedLumens[selectedLumens.length - 1];
            const rowDiff = Math.abs(last.row - lumen.row);
            const colDiff = Math.abs(last.col - lumen.col);

            // Horizontal, vertical, and diagonal connection
            if (rowDiff <= 1 && colDiff <= 1) {
              addLumenToChain(lumen);
            }
          }
        }
      }
    }
  }
}

function addLumenToChain(lumen) {
  selectedLumens.push(lumen);
  lumen.sprite.setScale(1.25);
  drawLine();
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
      scene.tweens.add({
        targets: lumen.sprite,
        scale: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => lumen.sprite.destroy()
      });
      board[lumen.row][lumen.col] = null;
    });

    scene.time.delayedCall(160, () => applyGravity(scene));
  } else {
    selectedLumens.forEach(lumen => lumen.sprite.setScale(1.0));
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

        let targetY = BOARD_OFFSET_Y + newRow * TILE_SIZE + TILE_SIZE / 2;
        let duration = 220 + (emptySlots * 35);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite,
          y: targetY,
          duration: duration,
          ease: 'Bounce.easeOut'
        });
      }
    }

    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = Phaser.Math.Between(0, LUMEN_CONFIGS.length - 1);

      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let startY = BOARD_OFFSET_Y - (i + 2) * TILE_SIZE;

      let sprite = scene.add.image(targetX, startY, `lumen_${type}`);

      board[r][c] = {
        sprite: sprite,
        type: type,
        row: r,
        col: c
      };

      let duration = 300 + (i * 50);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: sprite,
        y: targetY,
        duration: duration,
        ease: 'Bounce.easeOut'
      });
    }
  }

  scene.time.delayedCall(longestAnimation + 50, () => {
    isAnimating = false;
  });
}
