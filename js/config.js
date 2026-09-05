// --- config.js ---

// Core Game Dimensions (Dynamically scaled to any device)
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

// Grid Settings
const GRID_COLS = 7;
const GRID_ROWS = 7;
const TILE_SIZE = Math.floor(GAME_WIDTH / 8); 
const BOARD_OFFSET_X = (GAME_WIDTH - (GRID_COLS * TILE_SIZE)) / 2;
const BOARD_OFFSET_Y = (GAME_HEIGHT - (GRID_ROWS * TILE_SIZE)) / 2 + 30;

// Core Game Variables
let currentLevel = 1;
let score = 0;
let movesRemaining = 0;
let TARGET_SCORE = 0;
let ACTIVE_COLORS = [];

// Directory Paths (Mapping exactly to your GitHub structure)
const ASSET_PATHS = {
    ui: 'assets/ui_assets/',
    logos: 'assets/logos/',
    music: 'assets/music/',
    lumens: 'assets/lumens/',
    background: 'assets/background/'
};

// Lumen Configuration (Using _opened and _closed exactly as you uploaded them)
const LUMEN_TYPES = {
  0: { name: 'aether', textureClosed: 'aether_closed', textureOpen: 'aether_opened' },
  1: { name: 'verdant', textureClosed: 'verdant_closed', textureOpen: 'verdant_opened' },
  2: { name: 'solar', textureClosed: 'solar_closed', textureOpen: 'solar_opened' },
  3: { name: 'cosmic', textureClosed: 'cosmic_closed', textureOpen: 'cosmic_opened' },
  4: { name: 'blaze', textureClosed: 'blaze_closed', textureOpen: 'blaze_opened' },
  5: { name: 'terra', textureClosed: 'terra_closed', textureOpen: 'terra_opened' },
  6: { name: 'nova', textureClosed: 'nova_closed', textureOpen: 'nova_opened' }
};

// Booster Configuration (Less intense, deducts points, awards 0 extra points)
const BOOSTERS = {
  shuffle: { 
    cost: 100, 
    icon: 'icon_shuffle',
    scorePenalty: 50,       // Deducts 50 points upon use
    pointsAwarded: 0 
  },
  bomb: { 
    cost: 150, 
    icon: 'icon_bomb',
    radius: 1,              // Reduced intensity: 3x3 radius instead of 5x5
    scorePenalty: 100,      // Deducts 100 points upon use
    pointsAwarded: 0        // Exploded Lumens do NOT give extra points
  },
  burst: { 
    cost: 250, 
    icon: 'icon_burst',
    colorsToClear: 1,       // Reduced intensity: clears 1 color instead of 2
    scorePenalty: 200,      // Deducts 200 points upon use
    pointsAwarded: 0        // Cleared Lumens do NOT give extra points
  }
};

// Player Save & Progression System
function getPlayerProgress() {
  const saved = localStorage.getItem('lumenPopSave');
  return saved ? JSON.parse(saved) : { unlockedLevel: 1, scores: {}, stars: {} };
}

function savePlayerProgress(lvl, endScore, stars) {
  const progress = getPlayerProgress();
  // Only unlock the next level if the player got at least 1 star (won the level)
  if (lvl === progress.unlockedLevel && stars > 0) {
    progress.unlockedLevel++;
  }
  // Save highest score and stars
  if (!progress.scores[lvl] || endScore > progress.scores[lvl]) {
    progress.scores[lvl] = endScore;
    progress.stars[lvl] = stars;
  }
  localStorage.setItem('lumenPopSave', JSON.stringify(progress));
}

// Unlimited Dynamic Level Math generator
function getLevelData(lvl) {
  const baseTarget = 3000;
  const baseMoves = 35;
  return {
    target: baseTarget + ((lvl - 1) * 1000), 
    moves: baseMoves + ((lvl - 1) * 2),      
    colors: Math.min(4 + Math.floor((lvl - 1) / 10), 7) // Starts with 4 colors, caps at 7
  };
}
