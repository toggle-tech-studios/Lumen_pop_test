const GRID_ROWS = 6;
const GRID_COLS = 6;
const TILE_SIZE = 85;
const BOARD_OFFSET_X = 75;
const BOARD_OFFSET_Y = 320;

// Placeholder colors for your 5 Lumen types
const LUMEN_COLORS = [
  0x38BDF8, // Cyan
  0x34D399, // Emerald
  0xFBBF24, // Amber
  0xA855F7, // Purple
  0xF43F5E  // Ruby
];

const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1000,
  backgroundColor: '#0F1026',
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
let isAnimating = false; // Prevents dragging while pieces are falling

function create() {
  const scene = this;

  // UI Setup
  scoreText = scene.add.text(330, 120, 'SCORE: 0', {
    fontSize: '36px',
    fontStyle: 'bold',
    color: '#FFFFFF'
  }).setOrigin(0.5);

  scene.add.text(330, 170, 'Drag through 3+ matching Lumens', {
    fontSize: '18px',
    color: '#94A3B8'
  }).setOrigin(0.5);

  lineLayer = scene.add.graphics();
  lineLayer.setDepth(10); // Keeps the line above the pieces

  spawnGrid(scene);

  // Touch / Mouse Events
  scene.input.on('pointerup', () => endConnection(scene));
  scene.input.on('pointermove', (pointer) => handlePointerMove(scene, pointer));
}

function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = Phaser.Math.Between(0, LUMEN_COLORS.length - 1);
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      const circle = scene.add.circle(x, y, 32, LUMEN_COLORS[type]);
      circle.setStrokeStyle(3, 0xFFFFFF, 0.3);

      board[r][c] = {
        sprite: circle,
        type: type,
        row: r,
        col: c
      };
    }
  }
}

function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating) return;

  // Check if pointer is hovering over any Lumen
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);

      if (dist < 35) {
        if (!isDragging) {
          // Start a new chain
          isDragging = true;
          currentType = lumen.type;
          addLumenToChain(lumen);
        } else if (lumen.type === currentType) {
          // If hovering over the previous piece, allow backtracking (undo)
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            const removed = selectedLumens.pop();
            removed.sprite.setScale(1.0);
            removed.sprite.setStrokeStyle(3, 0xFFFFFF, 0.3);
            drawLine();
          } 
          // Add to chain if it's adjacent and not already selected
          else if (!selectedLumens.includes(lumen)) {
            const last = selectedLumens[selectedLumens.length - 1];
            const rowDiff = Math.abs(last.row - lumen.row);
            const colDiff = Math.abs(last.col - lumen.col);

            // Validates Horizontal, Vertical, and Diagonal (max 1 step away)
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
  lumen.sprite.setScale(1.2);
  lumen.sprite.setStrokeStyle(4, 0xFFFFFF, 0.9);
  drawLine();
}

function drawLine() {
  lineLayer.clear();
  if (selectedLumens.length < 2) return;

  lineLayer.lineStyle(8, 0xFFFFFF, 0.9);
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
    // Valid Match
    isAnimating = true;
    score += selectedLumens.length * 10;
    scoreText.setText('SCORE: ' + score);

    selectedLumens.forEach(lumen => {
      // Create a quick pop effect
      scene.tweens.add({
        targets: lumen.sprite,
        scale: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => lumen.sprite.destroy()
      });
      board[lumen.row][lumen.col] = null;
    });

    scene.time.delayedCall(150, () => applyGravity(scene));
  } else {
    // Invalid Match (less than 3) - Reset visual states
    selectedLumens.forEach(lumen => {
      lumen.sprite.setScale(1.0);
      lumen.sprite.setStrokeStyle(3, 0xFFFFFF, 0.3);
    });
  }

  selectedLumens = [];
  currentType = null;
}

function applyGravity(scene) {
  let longestAnimation = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let emptySlots = 0;
    
    // 1. Pull existing pieces down
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
        let duration = 200 + (emptySlots * 40);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite,
          y: targetY,
          duration: duration,
          ease: 'Bounce.easeOut'
        });
      }
    }

    // 2. Spawn new pieces at the top to fill empty slots
    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = Phaser.Math.Between(0, LUMEN_COLORS.length - 1);
      
      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let startY = BOARD_OFFSET_Y - (i + 2) * TILE_SIZE;

      let circle = scene.add.circle(targetX, startY, 32, LUMEN_COLORS[type]);
      circle.setStrokeStyle(3, 0xFFFFFF, 0.3);

      board[r][c] = {
        sprite: circle,
        type: type,
        row: r,
        col: c
      };

      let duration = 300 + (i * 60);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: circle,
        y: targetY,
        duration: duration,
        ease: 'Bounce.easeOut'
      });
    }
  }

  // Re-enable dragging once all animations finish
  scene.time.delayedCall(longestAnimation + 50, () => {
    isAnimating = false;
    // Note: Board validation logic (ensuring a valid move exists) will go here later!
  });
  }
          
