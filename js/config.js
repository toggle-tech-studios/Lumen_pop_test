// --- GAME CONFIGURATION & GLOBAL VARIABLES ---

// Grid Settings
const GRID_ROWS = 7;
const GRID_COLS = 7;
const TILE_SIZE = 78;  
const BOARD_OFFSET_X = 57;
const BOARD_OFFSET_Y = 290;

// Difficulty & Scoring
const ACTIVE_COLORS = 5; 
const TARGET_SCORE = 3000;

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

// UI & Progress State
let score = 0;
let movesRemaining = 35;
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
