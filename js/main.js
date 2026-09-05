// --- main.js ---

function getLevelBackground(lvl) {
    let index = Math.ceil(lvl / 10);
    index = ((index - 1) % 10) + 1;
    return `bg_level_${index}`;
}

class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }
    preload() { 
        this.load.image('loading_logo', ASSET_PATHS.logos + 'logo.png'); 
    }
    create() { this.scene.start('PreloadScene'); }
}

class PreloadScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloadScene' }); }
    
    init() {
        if (typeof updateGameDimensions === 'function') updateGameDimensions();
        
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

        this.barWidth = Math.min(300, GAME_WIDTH * 0.7);
        this.barHeight = 16;
        this.barX = cx - (this.barWidth / 2);
        this.barY = cy + 120;

        this.barBg = this.add.graphics();
        this.barBg.fillStyle(0x4a044e, 1);
        this.barBg.fillRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, 8);
        
        this.barFill = this.add.graphics();

        this.load.on('progress', (value) => { this.loadProgress = value; });

        // AUDIO
        this.load.audio('bgm_home', ASSET_PATHS.music + 'homepage_music.mp3');
        this.load.audio('bgm_game', ASSET_PATHS.music + 'gameplay_music.mp3');

        // UI
        this.load.image('ui_top_panel', ASSET_PATHS.ui + 'ui_top_panel.png');
        this.load.image('ui_booster_dock', ASSET_PATHS.ui + 'ui_booster_dock.png');
        this.load.image('node_active', ASSET_PATHS.ui + 'node_active.png');
        this.load.image('node_locked', ASSET_PATHS.ui + 'node_locked.png');
        this.load.image('popup_level_select', ASSET_PATHS.ui + 'popup_level_select.png');
        this.load.image('popup_game_over', ASSET_PATHS.ui + 'popup_game_over.png');
        
        this.load.image('icon_shuffle', ASSET_PATHS.ui + 'icon_shuffle.png');
        this.load.image('icon_bomb', ASSET_PATHS.ui + 'icon_bomb.png');
        this.load.image('icon_burst', ASSET_PATHS.ui + 'icon_burst.png');

        // LAZY LOADING
        this.load.image('bg_level_1', ASSET_PATHS.background + 'bg_level_1.png');

        // LUMENS
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
    
    preload() {
        const bgKey = getLevelBackground(currentLevel);
        if (!this.textures.exists(bgKey)) {
            this.load.image(bgKey, ASSET_PATHS.background + bgKey + '.png');
        }
    }

    create() {
        if (typeof updateGameDimensions === 'function') {
            updateGameDimensions();
        }

        try {
            if (this.sound && this.cache.audio.exists('bgm_game')) {
                this.sound.stopAll(); 
                this.sound.play('bgm_game', { loop: true, volume: 0.4 });
            }
        } catch (e) {}

        const bgKey = getLevelBackground(currentLevel);
        const finalBg = this.textures.exists(bgKey) ? bgKey : 'bg_level_1';

        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, finalBg)
            .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            .setDepth(-10);

        // Responsive top panel sizing
        const panelW = Math.min(GAME_WIDTH * 0.92, 440);
        const panelH = 75;
        const panelY = 48;

        this.add.image(GAME_WIDTH / 2, panelY, 'ui_top_panel')
            .setDisplaySize(panelW, panelH)
            .setDepth(10);
            
        this.levelText = this.add.text(GAME_WIDTH / 2 - (panelW * 0.33), panelY, `LVL\n${currentLevel}`, { 
            fontSize: '15px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.targetText = this.add.text(GAME_WIDTH / 2, panelY, `TARGET\n${TARGET_SCORE}`, { 
            fontSize: '16px', fontStyle: 'bold', color: '#fde047', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        this.movesText = this.add.text(GAME_WIDTH / 2 + (panelW * 0.33), panelY, `MOVES\n${movesRemaining}`, { 
            fontSize: '15px', fontStyle: 'bold', color: '#ffffff', align: 'center' 
        }).setOrigin(0.5).setDepth(11);

        // SCORE DISPLAY: Centered cleanly in the gap between top panel and board
        const scoreY = Math.max(panelY + (panelH / 2) + 12, BOARD_OFFSET_Y - 20);
        this.scoreText = this.add.text(GAME_WIDTH / 2, scoreY, `SCORE: ${score}`, { 
            fontSize: '19px', 
            fontStyle: 'bold', 
            color: '#38bdf8',
            stroke: '#10052b',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(12);

        // Bottom Booster Dock
        const dockW = Math.min(GAME_WIDTH * 0.88, 380);
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'ui_booster_dock')
            .setDisplaySize(dockW, 76)
            .setDepth(10);

        initGameLogic(this); 
        initGraphics(this);
    }
}

const phaserConfig = {
    type: Phaser.AUTO, 
    width: window.innerWidth, 
    height: window.innerHeight,
    backgroundColor: '#10052b',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloadScene, LevelSelectScene, GameScene]
};

window.addEventListener('DOMContentLoaded', () => { new Phaser.Game(phaserConfig); });
