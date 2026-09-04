// --- PHASER SCENES & GAME INITIALIZATION ---

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  
  preload() {
    // Hide the HTML loading text as soon as Phaser starts
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'none';

    // Load your custom Logo Image
    this.load.image('logo', 'assets/logo/loading.png');
  }

  create() {
    this.scene.start('PreloadScene');
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }
  
  preload() {
    // Basic dark background for the loading screen
    this.cameras.main.setBackgroundColor('#10052b');

    // Display the logo
    let logo = this.add.image(330, 380, 'logo');
    let scaleRatio = (logo.width > 0) ? (550 / logo.width) : 0.8;
    logo.setScale(scaleRatio);

    // Draw the bug-free loading bar outline
    let bgBar = this.add.graphics();
    let progressBar = this.add.graphics();
    
    bgBar.fillStyle(0xfbcfe8, 1);
    bgBar.fillRoundedRect(127, 697, 406, 30, 15);
    bgBar.fillStyle(0x4a044e, 1);
    bgBar.fillRoundedRect(130, 700, 400, 24, 12);
    
    // Percentage Text
    let loadingText = this.add.text(330, 670, 'SUMMONING LUMENS... 0%', { 
      fontSize: '18px', 
      fontStyle: 'bold', 
      color: '#fbcfe8', 
      letterSpacing: 2 
    }).setOrigin(0.5);

    // 🎵 LOAD EXTERNAL ASSETS
    this.load.audio('gameplayBgm', 'assets/music/homepage.mp3');
    
    // Load your custom game background for the Home Page & Level 1
    this.load.image('game_bg', 'game_bg.png'); 

    // Smooth filling bar with percentage counter
    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xFCD34D, 1);
        let currentWidth = Math.max(20, 396 * value); 
        progressBar.fillRoundedRect(132, 702, currentWidth, 20, 10);
        loadingText.setText('SUMMONING LUMENS... ' + Math.round(value * 100) + '%');
    });

    // Generate procedural assets when loading finishes
    this.load.on('complete', () => {
        generateParticleTexture(this);
        generateBoosterIcons(this);
        generateAllCanvasTextures(this);
    });
  }

  create() {
    // Go directly to the new Home Page (Levels Page)
    this.scene.start('LevelSelectScene');
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    mainScene = this; 
    
    // Reset variables on game start
    board = []; 
    selectedLumens = []; 
    isDragging = false;
    currentType = null; 
    currentDirection = null; 
    score = 0; 
    isAnimating = false; 
    boosterButtons = []; 
    starIcons = [];

    // --- DYNAMIC BACKGROUND LOGIC ---
    if (currentLevel === 1) {
      // Level 1 uses your specific image
      mainScene.add.image(330, 550, 'game_bg').setDepth(-10).setDisplaySize(660, 1100);
    } else {
      // Level 2+ generates a unique procedural theme based on the level number!
      this.generateLevelBackground(currentLevel);
      mainScene.add.image(330, 550, 'bg_lvl_' + currentLevel).setDepth(-10);
    }

    // Attempt to start audio legally
    try {
      initAudio(mainScene);
    } catch (e) {
      console.warn("Audio init in GameScene bypassed:", e);
    }

    buildTopUI(mainScene);
    buildProgressBar(mainScene);
    buildBoosterDock(mainScene);
    drawPinkBoardGrid(mainScene);

    lineGlowLayer = mainScene.add.graphics().setDepth(9);
    lineLayer = mainScene.add.graphics().setDepth(10);
    particlesLayer = mainScene.add.group();

    spawnGrid(mainScene);
    updateScoreUI(); 

    // Handle touch/clicks safely for children
    mainScene.input.on('pointerdown', (pointer) => handlePointerMove(mainScene, pointer));
    mainScene.input.on('pointermove', (pointer) => handlePointerMove(mainScene, pointer));
    mainScene.input.on('pointerup', () => endConnection(mainScene));
  }

  // Generates a totally unique space theme for higher levels
  generateLevelBackground(level) {
    if (this.textures.exists('bg_lvl_' + level)) return; // Don't recreate if already made

    const canvas = document.createElement('canvas'); 
    canvas.width = 660; 
    canvas.height = 1100;
    const ctx = canvas.getContext('2d'); 
    
    // Shift colors based on level (creates distinct alien skies!)
    const hue1 = (level * 35) % 360;
    const hue2 = (level * 35 + 40) % 360;

    const sky = ctx.createLinearGradient(0, 0, 0, 1100);
    sky.addColorStop(0, `hsl(${hue1}, 60%, 12%)`);
    sky.addColorStop(0.5, `hsl(${hue2}, 60%, 8%)`);
    sky.addColorStop(1, `hsl(${(hue1 + 180) % 360}, 50%, 15%)`);
    ctx.fillStyle = sky; 
    ctx.fillRect(0, 0, 660, 1100);

    // Stardust
    for(let i = 0; i < 150; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : `hsl(${hue1}, 100%, 80%)`;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(Math.random() * 660, Math.random() * 1100, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    this.textures.addCanvas('bg_lvl_' + level, canvas);
  }
}

// Make sure LevelSelectScene is loaded in the config!
const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1100,
  backgroundColor: '#10052b',
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, LevelSelectScene, GameScene]
};

// Start the game engine!
const phaserGame = new Phaser.Game(config);
