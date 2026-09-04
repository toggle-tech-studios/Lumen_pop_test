// --- HOME PAGE / LEVEL SELECTION SCENE ---

class LevelSelectScene extends Phaser.Scene {
  constructor() { 
    super({ key: 'LevelSelectScene' }); 
  }

  create() {
    // 1. Home Page Background (Using your requested game_bg.png)
    // We will ensure this is loaded in main.js in the next step!
    this.add.image(330, 550, 'game_bg').setDepth(-10).setDisplaySize(660, 1100);

    // Darken the background slightly so the UI pops
    this.add.rectangle(330, 550, 660, 1100, 0x10052b, 0.4).setDepth(-9);

    // Title text
    this.add.text(330, 100, 'LEVEL MAP', { 
      fontSize: '42px', 
      fontStyle: 'bold', 
      color: '#FFFFFF',
      shadow: { offsetX: 2, offsetY: 2, color: '#c084fc', blur: 10, fill: true }
    }).setOrigin(0.5);

    const progress = getPlayerProgress();
    const unlockedLevel = progress.unlockedLevel;

    // Grid settings for 15 levels (3 columns, 5 rows)
    const startX = 140;
    const startY = 220;
    const spacingX = 190;
    const spacingY = 160;

    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const lvl = LEVELS_DATA[i].level;
      const col = i % 3;
      const row = Math.floor(i / 3);
      
      const btnX = startX + (col * spacingX);
      const btnY = startY + (row * spacingY);

      const isUnlocked = lvl <= unlockedLevel;
      const starsEarned = progress.stars[lvl] || 0;

      // Draw level button container
      let btnContainer = this.add.container(btnX, btnY);
      let btnGfx = this.add.graphics();
      
      if (isUnlocked) {
        // Unlocked button styling
        btnGfx.fillStyle(0xfbcfe8, 1);
        btnGfx.fillRoundedRect(-54, -54, 108, 108, 28);
        btnGfx.fillStyle(0xbe185d, 1);
        btnGfx.fillRoundedRect(-50, -50, 100, 100, 24);
      } else {
        // Locked button styling (gray/dark)
        btnGfx.fillStyle(0x475569, 1);
        btnGfx.fillRoundedRect(-54, -54, 108, 108, 28);
        btnGfx.fillStyle(0x1e293b, 1);
        btnGfx.fillRoundedRect(-50, -50, 100, 100, 24);
      }
      
      let lvlText = this.add.text(0, -10, isUnlocked ? lvl : '🔒', { 
        fontSize: isUnlocked ? '36px' : '28px', 
        fontStyle: 'bold', 
        color: '#FFFFFF' 
      }).setOrigin(0.5);

      btnContainer.add([btnGfx, lvlText]);

      // Draw Stars for unlocked levels
      if (isUnlocked) {
        for (let s = 0; s < 3; s++) {
          const starColor = s < starsEarned ? '#FCD34D' : '#701a75';
          let star = this.add.text(-25 + (s * 25), 25, '★', {
            fontSize: '18px',
            color: starColor,
            stroke: '#FFFFFF',
            strokeThickness: s < starsEarned ? 1 : 0
          }).setOrigin(0.5);
          btnContainer.add(star);
        }
      }

      // Add interactivity if unlocked
      if (isUnlocked) {
        btnContainer.setSize(100, 100);
        btnContainer.setInteractive({ useHandCursor: true });

        btnContainer.on('pointerdown', () => {
          this.tweens.add({ targets: btnContainer, scaleX: 0.9, scaleY: 0.9, duration: 50 });
        });

        btnContainer.on('pointerup', () => {
          this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 50 });
          
          // Set global config variables for this specific level
          currentLevel = lvl;
          TARGET_SCORE = LEVELS_DATA[i].target;
          movesRemaining = LEVELS_DATA[i].moves;
          ACTIVE_COLORS = LEVELS_DATA[i].colors;

          // Start the game!
          if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
            this.sound.context.resume();
          }
          this.scene.start('GameScene');
        });
      }
    }
  }
}
