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

// LEVEL CONFIGURATION & PROGRESSION
const TOTAL_LEVELS = 15;
const LEVELS_DATA = [
  { level: 1,  target: 1200, moves: 30, colors: 4 },
  { level: 2,  target: 1800, moves: 28, colors: 4 },
  { level: 3,  target: 2500, moves: 28, colors: 5 },
  { level: 4,  target: 3200, moves: 26, colors: 5 },
  { level: 5,  target: 4000, moves: 25, colors: 5 },
  { level: 6,  target: 4800, moves: 25, colors: 5 },
  { level: 7,  target: 5500, moves: 24, colors: 5 },
  { level: 8,  target: 6200, moves: 24, colors: 6 },
  { level: 9,  target: 7000, moves: 23, colors: 6 },
  { level: 10, target: 8000, moves: 22, colors: 6 },
  { level: 11, target: 9000, moves: 22, colors: 6 },
  { level: 12, target: 10000, moves: 21, colors: 6 },
  { level: 13, target: 11500, moves: 20, colors: 6 },
  { level: 14, target: 13000, moves: 20, colors: 7 },
  { level: 15, target: 15000, moves: 20, colors: 7 }
];

let currentLevel = 1;
let TARGET_SCORE = 1200;
let ACTIVE_COLORS = 4;

// LocalStorage helpers to save progress
function getPlayerProgress() {
  const savedLevel = parseInt(localStorage.getItem('lumen_unlocked_level')) || 1;
  const starsData = JSON.parse(localStorage.getItem('lumen_stars_data')) || {};
  return { unlockedLevel: savedLevel, stars: starsData };
}

function saveLevelStars(lvl, starsCount) {
  const progress = getPlayerProgress();
  if (lvl >= progress.unlockedLevel && lvl < TOTAL_LEVELS) {
    localStorage.setItem('lumen_unlocked_level', lvl + 1);
  }
  const currentBest = progress.stars[lvl] || 0;
  if (starsCount > currentBest) {
    progress.stars[lvl] = starsCount;
    localStorage.setItem('lumen_stars_data', JSON.stringify(progress.stars));
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
let boosterButtons = []; 

// Global Audio & Scene References
let audioCtx;
let bgmMusic; 
let mainScene; 
