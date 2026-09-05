// --- config.js ---

// 1. Core Dynamic Dimensions
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

// 2. Responsive Board Grid Math (Fits both Samsung A32 and iPad screens)
const GRID_COLS = 7;
const GRID_ROWS = 7;
const maxBoardSize = Math.min(GAME_WIDTH * 0.92, 540);
const TILE_SIZE = Math.floor(maxBoardSize / Math.max(GRID_COLS, GRID_ROWS)); 
const BOARD_OFFSET_X = (GAME_WIDTH - (GRID_COLS * TILE_SIZE)) / 2;
const BOARD_OFFSET_Y = (GAME_HEIGHT - (GRID_ROWS * TILE_SIZE)) / 2 + 25;

// 3. Global Game State
let currentLevel = 1;
let score = 0;
let movesRemaining = 0;
let TARGET_SCORE = 0;
let ACTIVE_COLORS = [];

// 4. Exact Asset Paths matching your GitHub structure
const ASSET_PATHS = {
    ui: 'assets/ui_assets/',
    logos: 'assets/logos/',
    music: 'assets/music/',
    lumens: 'assets/lumens/',
    background: 'assets/background/'
};

// 5. Lumens (Matching your exact compressed files ending in _closed and _opened)
const LUMEN_TYPES = {
  0: { name: 'aether', textureClosed: 'aether_closed', textureOpen: 'aether_opened' },
  1: { name: 'verdant', textureClosed: 'verdant_closed', textureOpen: 'verdant_opened' },
  2: { name: 'solar', textureClosed: 'solar_closed', textureOpen: 'solar_opened' },
  3: { name: 'cosmic', textureClosed: 'cosmic_closed', textureOpen: 'cosmic_opened' },
  4: { name: 'blaze', textureClosed: 'blaze_closed', textureOpen: 'blaze_opened' },
  5: { name: 'terra', textureClosed: 'terra_closed', textureOpen: 'terra_opened' },
  6: { name: 'nova', textureClosed: 'nova_closed', textureOpen: 'nova_opened' }
};

// 6. Booster Settings (Deducts score, gives 0 extra points on pop)
const BOOSTERS = {
  shuffle: { cost: 100, icon: 'icon_shuffle', scorePenalty: 50, pointsAwarded: 0 },
  bomb: { cost: 150, icon: 'icon_bomb', radius: 1, scorePenalty: 100, pointsAwarded: 0 },
  burst: { cost: 250, icon: 'icon_burst', colorsToClear: 1, scorePenalty: 200, pointsAwarded: 0 }
};

// 7. Bulletproof Progress System (Never crashes on undefined stars or scores)
function getPlayerProgress() {
  const def = { unlockedLevel: 1, scores: {}, stars: {} };
  try {
    const saved = localStorage.getItem('lumenPopSave');
    if (!saved) return def;
    const parsed = JSON.parse(saved);
    if (!parsed.scores) parsed.scores = {};
    if (!parsed.stars) parsed.stars = {};
    if (!parsed.unlockedLevel) parsed.unlockedLevel = 1;
    return parsed;
  } catch (e) {
    return def;
  }
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
  try {
    localStorage.setItem('lumenPopSave', JSON.stringify(progress));
  } catch (e) {}
}

// 8. Infinite Level Scaling Formula
function getLevelData(lvl) {
  return {
    target: 3000 + ((lvl - 1) * 1000), 
    moves: 35 + ((lvl - 1) * 2),      
    colors: Math.min(4 + Math.floor((lvl - 1) / 10), 7)
  };
}
