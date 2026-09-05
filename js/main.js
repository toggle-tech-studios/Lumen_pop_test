// --- main.js ---

// Helper function to calculate background biomes (1-10 = bg 1, 11-20 = bg 2, etc.)
function getLevelBackground(lvl) {
    let index = Math.ceil(lvl / 10);
    index = ((index - 1) % 10) + 1; // Cycles 1 to 10 continuously for infinite levels
    return `bg_level_${index}`;
}

// 1. BOOT SCENE (Loads only the logo first so it can be displayed during the main load)
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    preload() {
        this.load.image('loading_logo', ASSET_PATHS.logos + 'loading.png');
    }
    create() {
        this.scene.start('PreloadScene');
    }
}

// 2. PRELOAD SCENE (Smooth Progress Bar & Asset Loading)
class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    init() {
        this.loadProgress = 0;
        this.visualProgress = 0;
        this.isLoaded = false;
        this.transitioning = false;
    }

    preload() {
        // Display Loading Logo
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'loading_logo')
            .setOrigin(0.5)
            .setDisplaySize(300, 300); // Scale appropriately for mobile

        // Setup Smooth Progress Bar Graphics
        this.barBg = this.add.graphics();
        this.barBg.fillStyle(0x4a044e, 1);
        this.barBg.fillRoundedRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 + 150, 300, 24, 12);

        this.barFill = this.add.graphics();

        // Track actual file load progress
        this.load.on('progress', (value) => {
            this.loadProgress = value;
        });

        // --- LOAD MUSIC ---
        this.load.audio('bgm_home', ASSET_PATHS.music + 'homepage music.mp3');
        this.load.audio('bgm_game', ASSET_PATHS.music + 'gameplay music.mp3');

        // --- LOAD UI ASSETS ---
        this.load.image('ui_top_panel', ASSET_PATHS.ui + 'ui_top_panel.png');
        this.load.image('ui_booster_dock', ASSET_PATHS.ui + 'ui_booster_dock.png');
        this.load.image('node_active', ASSET_PATHS.ui + 'node_active.png');
        this.load.image('node_locked', ASSET_PATHS.ui + 'node_locked.png');
        this.load.image('popup_level_select', ASSET_PATHS.ui + 'popup_level_select.png');
        this.load.image('popup_game_over', ASSET_PATHS.ui + 'popup_game_over.png');
        
        // --- LOAD BOOSTER ICONS ---
        this.load.image('icon_shuffle', ASSET_PATHS.ui + 'icon_shuffle.png');
        this.load.image('icon_bomb', ASSET_PATHS.ui + 'icon_bomb.png');
        this.load.image('icon_burst', ASSET_PATHS.ui + 'icon_burst.png');

        // --- LOAD BACKGROUNDS (1 to 10) ---
        for (let i = 1; i <= 10; i++) {
            this.load.image(`bg_level_${i}`, ASSET_PATHS.background + `bg_level_${i}.png`);
        }

        // --- LOAD LUMENS & FUSION ORB ---
        for (let i = 0; i < 7; i++) {
            let lumen = LUMEN_TYPES[i];
            this.load.image(lumen.textureClosed, ASSET_PATHS.lumens + lumen.textureClosed + '.png');
            this.load.image(lumen.textureOpen, ASSET_PATHS.lumens + lumen.textureOpen + '.png');
        }
        this.load.image('fusion_orb', ASSET_PATHS.lumens + 'fusion_orb.png');
    }

    create() {
        // Files are downloaded, but we wait for the visual bar to catch up
        this.isLoaded = true;
    }

    update() {
        if (this.transitioning) return;

        // Smoothly interpolate visual progress towards actual load progress
        this.visualProgress += (this.loadProgress - this.visualProgress) * 0.1;

        // Redraw smooth bar
        this.barFill.clear();
        this.barFill.fillStyle(0xbe185d, 1);
        let currentWidth = 300 * this.visualProgress;
        if (currentWidth > 0) {
            this.barFill.fillRoundedRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 + 150, currentWidth, 24, 12);
        }

        // Wait until visual bar is completely full (99.5% rounded up) before starting
        if (this.isLoaded && this.visualProgress >= 0.995) {
            this.transitioning = true;
            this.barFill.clear();
            this.barFill.fillStyle(0xbe185d, 1);
            this.barFill.fillRoundedRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 + 150, 300, 24, 12);
            
            // Start Home Music & Transition
            this.sound.stopAll();
            this.sound.play('bgm_home', { loop: true, volume: 0.5 });
            this.scene.start('LevelSelectScene');
        }
    }
}

// 3. GAME SCENE (Core Gameplay)
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Swap to Gameplay Music
        this.sound.stopAll();
        this.sound.play('bgm_game', { loop: true, volume: 0.4 });

        // Generate and Set Background based on current level biome
        const bgKey = getLevelBackground(currentLevel);
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-10);

        // UI Top Panel Setup
        let topUI = this.add.image(GAME_WIDTH / 2, 70, 'ui_top_panel')
            .setDisplaySize(GAME_WIDTH - 20, 100)
            .setDepth(10);
            
        this.levelText = this.add.text(50, 60, `LEVEL\n${currentLevel}`, { 
            fontSize: '18px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.targetText = this.add.text(GAME_WIDTH / 2, 60, `TARGET\n${TARGET_SCORE}`, { 
            fontSize: '22px', fontStyle: 'bold', color: '#fde047', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.movesText = this.add.text(GAME_WIDTH - 50, 60, `MOVES\n${movesRemaining}`, { 
            fontSize: '18px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.scoreText = this.add.text(20, 130, `SCORE: ${score}`, { 
            fontSize: '20px', fontStyle: 'bold', color: '#38bdf8' 
        }).setDepth(11);

        // Booster Dock Setup
        let dockUI = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'ui_booster_dock')
            .setDisplaySize(GAME_WIDTH - 20, 90)
            .setDepth(10);

        // Initialize Core Board Logic (Calls from logic.js & graphics.js)
        initGameLogic(this); 
        initGraphics(this);
    }
}

// 4. PHASER CONFIGURATION
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#10052b', // Failsafe cosmic purple
    scale: {
        mode: Phaser.Scale.RESIZE, // Adapts dynamically to device rotation/size
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloadScene, LevelSelectScene, GameScene]
};

// Start Game
const game = new Phaser.Game(config);
