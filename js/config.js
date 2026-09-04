// --- GAME CONFIGURATION & GLOBAL VARIABLES ---

// Grid Settings
const GRID_ROWS = 7;
const GRID_COLS = 7;
const TILE_SIZE = 78;  
const BOARD_OFFSET_X = 57;
const BOARD_OFFSET_Y = 290;

// Special Mechanics
const FUSION_ORB_TYPE = 99; 

// Ultra-Bright Lumen Designs
const LUMEN_CONFIGS = [
  { name: 'solar',   base: '#F59E0B', light: '#FDE047', glow: '#FEF08A', shape: 'star',    faceY: 2,  color: 0xFDE047 }, 
  { name: 'nova',    base: '#E11D48', light: '#FB7185', glow: '#FECDD3', shape: 'heart',   faceY: -3, color: 0xFB7185 }, 
  { name: 'aether',  base: '#0284C7', light: '#38BDF8', glow: '#BAE6FD', shape: 'diamond', faceY: 2,  color: 0x38BDF8 }, 
  { name: 'verdant', base: '#059669', light: '#34D399', glow: '#A7F3D0', shape: 'droplet', faceY: 5,  color: 0x34D399 }, 
  { name: 'cosmic',  base: '#7C3AED', light: '#C084FC', glow: '#E9D5FF', shape: 'round',   faceY: 0,  color: 0xC084FC }, 
  { name: 'terra',   base: '#EA580C', light: '#FB923C', glow: '#FED7AA', shape: 'hexagon', faceY: 0,  color: 0xFB923C }, 
  { name: 'blaze',   base: '#BE123C', light: '#F43F5E', glow: '#FECDD3', shape: 'flame',   faceY: 7,  color: 0xF43F5E }  
];

// --- ♾️ INFINITE LEVEL GENERATOR ---
// This safely generates difficulty for Level 1 or Level 5000 mathematically.
function getLevelData(level) {
  let colors = 4; // Start easy with 4 colors
  if (level > 10) colors = 5;
  if (level > 25) colors = 6;
  if (level > 50) colors = 7; // Max colors for crazy difficulty

  // Target score slowly scales up forever
  let baseTarget = 1000;
  let target = baseTarget + (level * 350) + (Math.floor(level / 10) * 1000);

  // Moves oscillate and tighten gently so it never becomes mathematically impossible
  let moves = 30 - Math.floor(level / 4);
  if (moves < 15) {
    moves = 15 + Math.floor((level % 10) / 2); // Gives a breather every few levels
  }

  return { level, target, moves, colors };
}

let currentLevel = 1;
let TARGET_SCORE = 1200;
let ACTIVE_COLORS = 4;

// --- 💾 SAVE SYSTEM ---
function getPlayerProgress() {
  const savedLevel = parseInt(localStorage.getItem('lumen_unlocked_level')) || 1;
  const starsData = JSON.parse(localStorage.getItem('lumen_stars_data')) || {};
  const scoresData = JSON.parse(localStorage.getItem('lumen_scores_data')) || {};
  return { unlockedLevel: savedLevel, stars: starsData, scores: scoresData };
}

function saveLevelProgress(lvl, score, starsCount) {
  const progress = getPlayerProgress();
  
  // Unlock next level if we beat the current maximum
  if (lvl === progress.unlockedLevel && starsCount > 0) {
    localStorage.setItem('lumen_unlocked_level', lvl + 1);
  }
  
  // Save best stars
  const currentBestStars = progress.stars[lvl] || 0;
  if (starsCount > currentBestStars) {
    progress.stars[lvl] = starsCount;
    localStorage.setItem('lumen_stars_data', JSON.stringify(progress.stars));
  }
  
  // Save best score
  const currentBestScore = progress.scores[lvl] || 0;
  if (score > currentBestScore) {
    progress.scores[lvl] = score;
    localStorage.setItem('lumen_scores_data', JSON.stringify(progress.scores));
  }
}

// Global Game State Variables
let board = [];
let selectedLumens = [];
let isDragging = false;
let currentType = null;
let currentDirection = null; 

// Graphics Layers
let lineLayer;
let lineGlowLayer;
let particlesLayer;
let overlayLayer;

// UI & Gameplay State
let score = 0;
let movesRemaining = 30;
let scoreText;
let movesText;
let progressBar;
let starIcons = [];
let isAnimating = false;
let gameState = 'PLAYING'; // 'PLAYING', 'WON', 'LOST'
let boosterButtons = []; 

// Global Audio & Scene References
let audioCtx;
let bgmMusic; 
let mainScene; 
