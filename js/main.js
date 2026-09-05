// --- PHASER SCENES & GAME INITIALIZATION ---

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  
  preload() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'none';

    this.load.image('logo', 'assets/logo/loading.png');
  }

  create() {
    this.scene.start('PreloadScene');
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }
  
  preload() {
    this.cameras.main.setBackgroundColor('#10052b');

    // Center the logo perfectly in the new dynamic screen
    let logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'logo');
    let scaleRatio = (logo.width > 0) ? (550 / logo.width) : 0.8;
    logo.setScale(scaleRatio);

    let bgBar = this.add.graphics();
    let progressBar = this.add.graphics();
    
    // Center the loading bar at the bottom
    const barY = GAME_HEIGHT - 200;
    const barX = (GAME_WIDTH - 406) / 2;
    
    bgBar.fillStyle(0xfbcfe8, 1);
    bgBar.fillRoundedRect(barX, barY, 406, 30, 15);
    bgBar.fillStyle(0x4a044e, 1);
    bgBar.fillRoundedRect(barX + 3, barY + 3, 400, 24, 12);
    
    let loadingText = this.add.text(GAME_WIDTH / 2, barY - 30, 'SUMMONING LUMENS... 0%', { 
      fontSize: '18px', 
      fontStyle: 'bold', 
      color: '#fbcfe8', 
      letterSpacing: 2 
    }).setOrigin(0.5);

    this.load.audio('gameplayBgm', 'assets/music/homepage.mp3');
    this.load.image('game_bg', 'game_bg.png'); 

    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xFCD34D, 1);
        let currentWidth = Math.max(20, 396 * value); 
        progressBar.fillRoundedRect(barX + 5, barY + 5, currentWidth, 20, 10);
        loadingText.setText('SUMMONING LUMENS... ' + Math.round(value * 100) + '%');
    });

    this.load.on('complete', () => {
        generateParticleTexture(this);
        generateBoosterIcons(this);
        generateAllCanvasTextures(this);
    });
  }

  create() {
    this.scene.start('LevelSelectScene');
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    mainScene = this; 
    
    board = []; 
    selectedLumens = []; 
    isDragging = false;
    currentType = null; 
    currentDirection = null; 
    score = 0; 
    isAnimating = false; 
    boosterButtons = []; 
    starIcons = [];

    // Ensure background covers the whole dynamic screen
    if (currentLevel === 1) {
      mainScene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'game_bg').setDepth(-10).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      this.generateLevelBackground(currentLevel);
      mainScene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_lvl_' + currentLevel).setDepth(-10);
    }

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

    mainScene.input.on('pointerdown', (pointer) => handlePointerMove(mainScene, pointer));
    mainScene.input.on('pointermove', (pointer) => handlePointerMove(mainScene, pointer));
    mainScene.input.on('pointerup', () => endConnection(mainScene));
  }

  generateLevelBackground(level) {
    if (this.textures.exists('bg_lvl_' + level)) return;

    const canvas = document.createElement('canvas'); 
    canvas.width = GAME_WIDTH; 
    canvas.height = GAME_HEIGHT;
    const ctx = canvas.getContext('2d'); 
    
    const hue1 = (level * 35) % 360;
    const hue2 = (level * 35 + 40) % 360;

    const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    sky.addColorStop(0, `hsl(${hue1}, 60%, 12%)`);
    sky.addColorStop(0.5, `hsl(${hue2}, 60%, 8%)`);
    sky.addColorStop(1, `hsl(${(hue1 + 180) % 360}, 50%, 15%)`);
    ctx.fillStyle = sky; 
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for(let i = 0; i < 150; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : `hsl(${hue1}, 100%, 80%)`;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    this.textures.addCanvas('bg_lvl_' + level, canvas);
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10052b',
  scale: { 
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: document.body
  },
  scene: [BootScene, PreloadScene, LevelSelectScene, GameScene]
};

const phaserGame = new Phaser.Game(config);
