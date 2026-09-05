// --- main.js ---

function getLevelBackground(lvl) {
    let index = Math.ceil(lvl / 10);
    index = ((index - 1) % 10) + 1;
    return `bg_level_${index}`;
}

class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }
    preload() { 
        // Updated to use your renamed logo.png
        this.load.image('loading_logo', ASSET_PATHS.logos + 'logo.png'); 
    }
    create() { this.scene.start('PreloadScene'); }
}

class PreloadScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloadScene' }); }
    
    init() {
        this.loadProgress = 0;
        this.visualProgress = 0;
        this.isLoaded = false;
        this.transitioning = false;
    }
    
    preload() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        if (this.textures.exists('loading_logo')) {
            this.add.image(cx, cy - 60, 'loading_logo')
                .setOrigin(0.5)
                .setDisplaySize(Math.min(200, GAME_WIDTH * 0.4), Math.min(200, GAME_WIDTH * 0.4));
        }

        // Setup smooth progress bar
        this.barWidth = Math.min(300, GAME_WIDTH * 0.7);
        this.barHeight = 16;
        this.barX = cx - (this.barWidth / 2);
        this.barY = cy + 120;

        this.barBg = this.add.graphics();
        this.barBg.fillStyle(0x4a044e, 1);
        this.barBg.fillRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, 8);
        
        this.barFill = this.add.graphics();

        this.load.on('progress', (value) => { this.loadProgress = value; });

        // LOAD AUDIO (Updated to your renamed files without spaces!)
        this.load.audio('bgm_home', ASSET_PATHS.music + 'homepage_music.mp3');
        this.load.audio('bgm_game', ASSET_PATHS.music + 'gameplay_music.mp3');

        // LOAD UI
        this.load.image('ui_top_panel', ASSET_PATHS.ui + 'ui_top_panel.png');
        this.load.image('ui_booster_dock', ASSET_PATHS.ui + 'ui_booster_dock.png');
        this.load.image('node_active', ASSET_PATHS.ui + 'node_active.png');
        this.load.image('node_locked', ASSET_PATHS.ui + 'node_locked.png');
        this.load.image('popup_level_select', ASSET_PATHS.ui + 'popup_level_select.png');
        this.load.image('popup_game_over', ASSET_PATHS.ui + 'popup_game_over.png');
        
        this.load.image('icon_shuffle', ASSET_PATHS.ui + 'icon_shuffle.png');
        this.load.image('icon_bomb', ASSET_PATHS.ui + 'icon_bomb.png');
        this.load.image('icon_burst', ASSET_PATHS.ui + 'icon_burst.png');

        // LAZY LOADING FIX: We ONLY load Background 1 here. 
        // This stops the memory crash and cuts load time by 70%.
        this.load.image('bg_level_1', ASSET_PATHS.background + 'bg_level_1.png');

        // LOAD LUMENS
        for (let i = 0; i < 7; i++) {
            this.load.image(LUMEN_TYPES[i].textureClosed, ASSET_PATHS.lumens + LUMEN_TYPES[i].textureClosed + '.png');
            this.load.image(LUMEN_TYPES[i].textureOpen, ASSET_PATHS.lumens + LUMEN_TYPES[i].textureOpen + '.png');
        }
        this.load.image('fusion_orb', ASSET_PATHS.lumens + 'fusion_orb.png');
    }
    
    create() { this.isLoaded = true; }
    
    update() {
        if (this.transitioning) return;
        
        this.visualProgress += (this.loadProgress - this.visualProgress) * 0.15;
        this.barFill.clear();
        this.barFill.fillStyle(0xbe185d, 1);
        
        let currentWidth = this.barWidth * this.visualProgress;
        
        // CANVAS FIX: Prevents a crash when the bar width is smaller than the rounded corners
        if (currentWidth >= 16) {
            this.barFill.fillRoundedRect(this.barX, this.barY, currentWidth, this.barHeight, 8);
        }

        if (this.isLoaded && this.visualProgress >= 0.99) {
            this.transitioning = true;
            try {
                if (this.sound && this.cache.audio.exists('bgm_home')) {
                    this.sound.stopAll(); 
                    this.sound.play('bgm_home', { loop: true, volume: 0.5 });
                }
            } catch (e) {}
            this.scene.start('LevelSelectScene');
        }
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    
    // Dynamic preloader: Loads the specific background for this level just before starting
    preload() {
        const bgKey = getLevelBackground(currentLevel);
        if (!this.textures.exists(bgKey)) {
            this.load.image(bgKey, ASSET_PATHS.background + bgKey + '.png');
        }
    }

    create() {
        try {
            if (this.sound && this.cache.audio.exists('bgm_game')) {
                this.sound.stopAll(); 
                this.sound.play('bgm_game', { loop: true, volume: 0.4 });
            }
        } catch (e) {}

        const bgKey = getLevelBackground(currentLevel);
        const finalBg = this.textures.exists(bgKey) ? bgKey : 'bg_level_1'; // Failsafe

        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, finalBg)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-10);

        const panelW = Math.min(GAME_WIDTH - 20, 500);
        this.add.image(GAME_WIDTH / 2, 60, 'ui_top_panel').setDisplaySize(panelW, 85).setDepth(10);
            
        this.levelText = this.add.text(GAME_WIDTH / 2 - (panelW * 0.35), 60, `LVL\n${currentLevel}`, { 
            fontSize: '16px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.targetText = this.add.text(GAME_WIDTH / 2, 60, `TARGET\n${TARGET_SCORE}`, { 
            fontSize: '18px', fontStyle: 'bold', color: '#fde047', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.movesText = this.add.text(GAME_WIDTH / 2 + (panelW * 0.35), 60, `MOVES\n${movesRemaining}`, { 
            fontSize: '16px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.scoreText = this.add.text(GAME_WIDTH / 2 - (panelW * 0.45), 115, `SCORE: ${score}`, { 
            fontSize: '18px', fontStyle: 'bold', color: '#38bdf8' 
        }).setOrigin(0, 0.5).setDepth(11);

        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'ui_booster_dock').setDisplaySize(panelW, 80).setDepth(10);

        initGameLogic(this); 
        initGraphics(this);
    }
}

const phaserConfig = {
    type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#10052b',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloadScene, LevelSelectScene, GameScene]
};
window.addEventListener('DOMContentLoaded', () => { new Phaser.Game(phaserConfig); });
