// --- PHASER SCENES & GAME INITIALIZATION ---

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  
  preload() {
    // Hide the HTML loading text as soon as Phaser starts
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'none';

    // Generate the procedural background
    generateKidFriendlyBackground(this);
    
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
    this.add.image(330, 550, 'bg').setDepth(-10);

    // Display the logo
    let logo = this.add.image(330, 380, 'logo');
    let scaleRatio = (logo.width > 0) ? (550 / logo.width) : 0.8;
    logo.setScale(scaleRatio);

    // Draw the loading bar outline
    let bgBar = this.add.graphics();
    let progressBar = this.add.graphics();
    bgBar.fillStyle(0x4a044e, 0.9);
    bgBar.fillRoundedRect(130, 700, 400, 24, 12);
    bgBar.lineStyle(3, 0xfbcfe8, 1);
    bgBar.strokeRoundedRect(130, 700, 400, 24, 12);
    
    this.add.text(330, 670, 'SUMMONING LUMENS...', { fontSize: '18px', fontStyle: 'bold', color: '#fbcfe8', letterSpacing: 2 }).setOrigin(0.5);

    // 🎵 Load MP3 background music
    this.load.audio('gameplayBgm', 'assets/music/homepage.mp3');

    // Animate the loading bar as the music downloads
    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xFCD34D, 1);
        progressBar.fillRoundedRect(134, 704, 392 * value, 16, 8);
    });

    // Generate procedural assets when loading finishes
    this.load.on('complete', () => {
        generateParticleTexture(this);
        generateBoosterIcons(this);
        generateAllCanvasTextures(this);
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    this.add.image(330, 550, 'bg').setDepth(-10);

    let logo = this.add.image(330, 380, 'logo');
    let scaleRatio = (logo.width > 0) ? (550 / logo.width) : 0.8;
    logo.setScale(scaleRatio);

    // Animate the logo floating
    this.tweens.add({
        targets: logo, y: 350, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Draw the PLAY NOW button
    let btnContainer = this.add.container(330, 750);
    let startBtn = this.add.graphics();
    startBtn.fillStyle(0xbe185d, 1);
    startBtn.fillRoundedRect(-150, -40, 300, 80, 24);
    startBtn.lineStyle(4, 0xfbcfe8, 1);
    startBtn.strokeRoundedRect(-150, -40, 300, 80, 24);
    let startText = this.add.text(0, 0, 'PLAY NOW', { fontSize: '32px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    btnContainer.add([startBtn, startText]);

    // Animate the button pulsing
    this.tweens.add({
        targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Invisible clickable zone covering the whole screen
    let zone = this.add.zone(330, 550, 660, 1100).setInteractive({ useHandCursor: true });
    
    zone.on('pointerdown', () => {
        // Unlock audio legally for mobile browsers
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
        initAudio(this);
        this.scene.start('GameScene');
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    mainScene = this; 
    
    // Reset variables on game start
    board = []; selectedLumens = []; isDragging = false;
    currentType = null; currentDirection = null; 
    score = 0; movesRemaining = 35;
    isAnimating = false; boosterButtons = []; starIcons = [];

    mainScene.add.image(330, 550, 'bg').setDepth(-10);

    initAudio(mainScene);

    buildTopUI(mainScene);
    buildProgressBar(mainScene);
    buildBoosterDock(mainScene);
    drawPinkBoardGrid(mainScene);

    lineGlowLayer = mainScene.add.graphics().setDepth(9);
    lineLayer = mainScene.add.graphics().setDepth(10);
    particlesLayer = mainScene.add.group();

    spawnGrid(mainScene);
    updateScoreUI(); 

    mainScene.time.addEvent({ delay: 1800, loop: true, callback: () => triggerRandomPeek(mainScene) });
    mainScene.input.on('pointerup', () => endConnection(mainScene));
    mainScene.input.on('pointermove', (pointer) => handlePointerMove(mainScene, pointer));
  }
}

// Ensure the config object points to the scenes we just created
const config = {
  type: Phaser.AUTO,
  width: 660,
  height: 1100,
  backgroundColor: '#090d16',
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, MenuScene, GameScene]
};

// Start the game!
const phaserGame = new Phaser.Game(config);
