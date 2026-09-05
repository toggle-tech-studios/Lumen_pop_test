// --- config.js ---

// Core Game Dimensions
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

// Grid Settings
const GRID_COLS = 7;
const GRID_ROWS = 7;

// FIX: Dynamically clamp the board size so it never spills off a narrow phone screen
const maxBoardSize = Math.min(GAME_WIDTH * 0.92, 550);
const TILE_SIZE = Math.floor(maxBoardSize / Math.max(GRID_COLS, GRID_ROWS)); 
const BOARD_OFFSET_X = (GAME_WIDTH - (GRID_COLS * TILE_SIZE)) / 2;
const BOARD_OFFSET_Y = (GAME_HEIGHT - (GRID_ROWS * TILE_SIZE)) / 2 + 25;

// Core Game Variables
let currentLevel = 1;
let score = 0;
let movesRemaining = 0;
let TARGET_SCORE = 0;
let ACTIVE_COLORS = [];

// FIX: Paths must be relative to index.html, NOT the js folder!
const ASSET_PATHS = {
    ui: 'assets/ui_assets/',
    logos: 'assets/logos/',
    music: 'assets/music/',
    lumens: 'assets/lumens/',
    background: 'assets/background/'
};

// Lumen Configuration
const LUMEN_TYPES = {
  0: { name: 'aether', textureClosed: 'aether_closed', textureOpen: 'aether_opened' },
  1: { name: 'verdant', textureClosed: 'verdant_closed', textureOpen: 'verdant_opened' },
  2: { name: 'solar', textureClosed: 'solar_closed', textureOpen: 'solar_opened' },
  3: { name: 'cosmic', textureClosed: 'cosmic_closed', textureOpen: 'cosmic_opened' },
  4: { name: 'blaze', textureClosed: 'blaze_closed', textureOpen: 'blaze_opened' },
  5: { name: 'terra', textureClosed: 'terra_closed', textureOpen: 'terra_opened' },
  6: { name: 'nova', textureClosed: 'nova_closed', textureOpen: 'nova_opened' }
};

// Booster Configuration
const BOOSTERS = {
  shuffle: { cost: 100, icon: 'icon_shuffle', scorePenalty: 50, pointsAwarded: 0 },
  bomb: { cost: 150, icon: 'icon_bomb', radius: 1, scorePenalty: 100, pointsAwarded: 0 },
  burst: { cost: 250, icon: 'icon_burst', colorsToClear: 1, scorePenalty: 200, pointsAwarded: 0 }
};

// Player Save & Progression System
function getPlayerProgress() {
  const saved = localStorage.getItem('lumenPopSave');
  return saved ? JSON.parse(saved) : { unlockedLevel: 1, scores: {}, stars: {} };
}

function savePlayerProgress(lvl, endScore, stars) {
  const progress = getPlayerProgress();
  if (lvl === progress.unlockedLevel && stars > 0) {
    progress.unlockedLevel++;
  }
  if (!progress.scores[lvl] || endScore > progress.scores[lvl]) {
    progress.scores[lvl] = endScore;
    progress.stars[lvl] = stars;
  }
  localStorage.setItem('lumenPopSave', JSON.stringify(progress));
}

// Unlimited Dynamic Level Math generator
function getLevelData(lvl) {
  return {
    target: 3000 + ((lvl - 1) * 1000), 
    moves: 35 + ((lvl - 1) * 2),      
    colors: Math.min(4 + Math.floor((lvl - 1) / 10), 7)
  };
}
