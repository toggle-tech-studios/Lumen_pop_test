
// --- levels.js ---

class LevelSelectScene extends Phaser.Scene {
  constructor() { 
    super({ key: 'LevelSelectScene' }); 
  }

  create() {
    // 1. Music Check (Ensure Homepage Music is playing)
    if (!this.sound.get('bgm_home') || !this.sound.get('bgm_home').isPlaying) {
        this.sound.stopAll();
        this.sound.play('bgm_home', { loop: true, volume: 0.5 });
    }

    this.isPopupOpen = false;
    const progress = getPlayerProgress();
    const unlockedLvl = progress.unlockedLevel;
    
    // 2. Dynamic Progression Logic (Show 50. At lvl 40, show 100, etc.)
    let renderMax = 50;
    let threshold = 40;
    while (unlockedLvl >= threshold) {
        renderMax += 50;
        threshold += 50;
    }
    
    const spacingY = 160;
    // Calculate full map height
    const worldHeight = Math.max(GAME_HEIGHT, (renderMax * spacingY) + (GAME_HEIGHT / 2));

    // Setup scrollable camera boundaries
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, worldHeight);

    // 3. Render 10-Level Biome Backgrounds (Stacked Vertically)
    const biomesCount = Math.ceil(renderMax / 10);
    const biomeHeight = 10 * spacingY;
    
    for (let b = 0; b < biomesCount; b++) {
        let bgIndex = (b % 10) + 1; // Cycles 1-10 infinitely
        // Calculate the center Y for this 10-level chunk
        let centerY = worldHeight - (GAME_HEIGHT / 2) - (b * 10 + 4.5) * spacingY;
        
        let bg = this.add.image(GAME_WIDTH / 2, centerY, `bg_level_${bgIndex}`);
        bg.setDisplaySize(GAME_WIDTH, biomeHeight + 50); // +50 prevents pixel gaps
        bg.setDepth(-10);
    }

    // 4. Vibrant Ambient Particles
    for (let p = 0; p < 30; p++) {
        let px = Phaser.Math.Between(0, GAME_WIDTH);
        let py = Phaser.Math.Between(0, worldHeight);
        let particle = this.add.circle(px, py, Phaser.Math.Between(3, 7), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.8)).setDepth(-5);
        
        this.tweens.add({
            targets: particle,
            y: py - Phaser.Math.Between(100, 300),
            alpha: 0,
            duration: Phaser.Math.Between(3000, 6000),
            repeat: -1,
            yoyo: false
        });
    }

    // 5. Procedural Winding Path
    let pathGraphics = this.add.graphics().setDepth(-2);
    pathGraphics.lineStyle(14, 0xffffff, 0.9);
    pathGraphics.beginPath();

    const nodePositions = [];
    for (let i = 1; i <= renderMax; i++) {
      let y = worldHeight - (GAME_HEIGHT / 2) - ((i - 1) * spacingY);
      let x = (GAME_WIDTH / 2) + Math.sin(i * 0.7) * 125; 
      nodePositions.push({ lvl: i, x, y });

      if (i === 1) pathGraphics.moveTo(x, y);
      else pathGraphics.lineTo(x, y);
    }
    pathGraphics.strokePath();

    // 6. Draw Nodes (Using Custom UI PNGs)
    nodePositions.forEach(pos => {
      this.createNode(pos.lvl, pos.x, pos.y, unlockedLvl, progress);
    });

    // 7. Modal Popup Construction
    this.createPopupUI();

    // 8. Drag/Swipe Scroll Listener
    this.setupScrolling();

    // 9. Auto-scroll to Current Level
    let targetY = worldHeight - (GAME_HEIGHT / 2) - ((unlockedLvl - 1) * spacingY);
    this.cameras.main.scrollY = Math.max(0, targetY - (GAME_HEIGHT / 2));
  }

  createNode(lvl, x, y, unlockedLvl, progress) {
    const isUnlocked = lvl <= unlockedLvl;
    const isCurrent = lvl === unlockedLvl;
    const starsEarned = progress.stars[lvl] || 0;

    let btnContainer = this.add.container(x, y).setDepth(2);
    
    // Choose specific PNG based on lock state
    let nodeKey = isUnlocked ? 'node_active' : 'node_locked';
    let nodeImg = this.add.image(0, 0, nodeKey).setDisplaySize(90, 90);
    
    let lvlText = this.add.text(0, isUnlocked ? -6 : 0, isUnlocked ? lvl : '🔒', { 
      fontSize: isUnlocked ? '34px' : '28px', fontStyle: 'bold', color: '#FFFFFF' 
    }).setOrigin(0.5);

    btnContainer.add([nodeImg, lvlText]);

    // Current Level Pulse Animation
    if (isCurrent) {
      this.tweens.add({
        targets: btnContainer, scaleX: 1.15, scaleY: 1.15, 
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Stars logic for beaten levels
    if (isUnlocked && !isCurrent) {
      for (let s = 0; s < 3; s++) {
        const starColor = s < starsEarned ? '#FCD34D' : '#9ca3af';
        let star = this.add.text(-24 + (s * 24), 28, '★', {
          fontSize: '22px', color: starColor, stroke: '#111827', strokeThickness: 3
        }).setOrigin(0.5);
        btnContainer.add(star);
      }
    }

    if (isUnlocked) {
      btnContainer.setSize(90, 90);
      btnContainer.setInteractive({ useHandCursor: true });

      btnContainer.on('pointerdown', () => { if (!this.isDraggingMap && !this.isPopupOpen) btnContainer.setScale(0.9); });
      btnContainer.on('pointerout', () => { if (!isCurrent) btnContainer.setScale(1); });
      btnContainer.on('pointerup', () => {
        if (!this.isDraggingMap && !this.isPopupOpen) {
          if (!isCurrent) btnContainer.setScale(1);
          try { initAudio(this); } catch (e) {}
          this.openPopup(lvl, starsEarned, progress.scores[lvl] || 0);
        }
      });
    }
  }

  setupScrolling() {
    this.isDraggingMap = false;
    let startY = 0;
    let camStartY = 0;

    this.input.on('pointerdown', (pointer) => {
      if (this.isPopupOpen) return;
      this.isDraggingMap = false; 
      startY = pointer.y; 
      camStartY = this.cameras.main.scrollY; 
    });
    
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown || this.isPopupOpen) return;
      let distance = Math.abs(pointer.y - startY);
      if (distance > 8) {
        this.isDraggingMap = true;
        this.cameras.main.scrollY = camStartY - (pointer.y - startY);
      }
    });
  }

  createPopupUI() {
    // Popup container aligned to dynamic center
    this.popupContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200).setVisible(false);

    // Full-screen blocker behind popup
    let overlay = this.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.7).setInteractive();

    // Use specific PNG for Level Select
    let panel = this.add.image(0, 0, 'popup_level_select').setDisplaySize(360, 360);

    this.popupTitle = this.add.text(0, -110, 'LEVEL 1', { fontSize: '38px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    
    this.popupStars = [];
    for (let i = 0; i < 3; i++) {
        let star = this.add.text(-60 + (i * 60), -40, '★', { fontSize: '54px', color: '#701a75' }).setOrigin(0.5);
        this.popupStars.push(star);
    }

    this.popupTarget = this.add.text(0, 25, 'Target: 0', { fontSize: '24px', fontStyle: 'bold', color: '#fbcfe8' }).setOrigin(0.5);
    this.popupMoves = this.add.text(0, 60, 'Moves: 0', { fontSize: '24px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5);
    this.popupBest = this.add.text(0, 95, 'Unplayed', { fontSize: '20px', fontStyle: 'italic', color: '#a78bfa' }).setOrigin(0.5);

    // Interactive Zone over the built-in Play slot on the PNG
    this.playZone = this.add.zone(0, 135, 200, 70).setInteractive({ useHandCursor: true });
    let playText = this.add.text(0, 135, 'PLAY', { fontSize: '32px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#be185d', strokeThickness: 4 }).setOrigin(0.5);

    this.playZone.on('pointerdown', () => { playText.setScale(0.9); });
    this.playZone.on('pointerup', () => {
      playText.setScale(1);
      this.isPopupOpen = false;
      this.scene.start('GameScene');
    });

    // Close Button (Top Right)
    this.closeBtn = this.add.text(140, -140, '✖', { fontSize: '36px', color: '#fbcfe8' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerup', () => this.closePopup());

    this.popupContainer.add([
      overlay, panel, this.popupTitle, 
      ...this.popupStars, 
      this.popupTarget, this.popupMoves, this.popupBest, 
      this.playZone, playText, this.closeBtn
    ]);
  }

  openPopup(lvl, starsEarned, bestScore) {
    this.isPopupOpen = true;
    let data = getLevelData(lvl); 

    currentLevel = lvl;
    TARGET_SCORE = data.target;
    movesRemaining = data.moves;
    ACTIVE_COLORS = data.colors;

    this.popupTitle.setText(`LEVEL ${lvl}`);
    this.popupTarget.setText(`Target: ${data.target}`);
    this.popupMoves.setText(`Moves: ${data.moves}`);
    this.popupBest.setText(bestScore > 0 ? `Best Score: ${bestScore}` : 'Unplayed');

    this.popupStars.forEach((star, index) => {
        star.setColor(index < starsEarned ? '#FCD34D' : '#701a75');
        star.setStroke('#FFFFFF', index < starsEarned ? 2 : 0);
    });

    // Dynamically align popup directly to current camera view center
    const currentCamCenterY = this.cameras.main.scrollY + (this.cameras.main.height / 2);
    this.popupContainer.setPosition(GAME_WIDTH / 2, currentCamCenterY);
    
    this.popupContainer.setScale(0.7);
    this.popupContainer.setVisible(true);
    
    this.tweens.add({
        targets: this.popupContainer,
        scale: 1, duration: 250, ease: 'Back.easeOut'
    });
  }

  closePopup() {
    this.tweens.add({
      targets: this.popupContainer,
      scale: 0.7, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => {
        this.popupContainer.setVisible(false);
        this.isPopupOpen = false;
      }
    });
  }
}
