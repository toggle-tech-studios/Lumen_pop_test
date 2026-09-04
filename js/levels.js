// --- HOME PAGE / INFINITE LEVEL MAP SCENE ---

class LevelSelectScene extends Phaser.Scene {
  constructor() { 
    super({ key: 'LevelSelectScene' }); 
  }

  create() {
    this.isPopupOpen = false;
    const progress = getPlayerProgress();
    const unlockedLvl = progress.unlockedLevel;
    
    // Procedurally render 10 levels beyond current progress
    const renderMax = unlockedLvl + 10; 
    const spacingY = 150;
    const worldHeight = Math.max(1100, (renderMax * spacingY) + 500);

    // Setup scrollable camera boundaries
    this.cameras.main.setBounds(0, 0, 660, worldHeight);

    // 1. Repeating Background
    this.add.tileSprite(330, worldHeight / 2, 660, worldHeight, 'game_bg').setDepth(-10);
    this.add.rectangle(330, worldHeight / 2, 660, worldHeight, 0x10052b, 0.4).setDepth(-9);

    // 2. Procedural Winding Path
    let pathGraphics = this.add.graphics().setDepth(0);
    pathGraphics.lineStyle(16, 0xfbcfe8, 0.5);
    pathGraphics.beginPath();

    let innerPath = this.add.graphics().setDepth(0);
    innerPath.lineStyle(6, 0xFFFFFF, 0.9);
    innerPath.beginPath();

    const nodePositions = [];
    for (let i = 1; i <= renderMax; i++) {
      let y = worldHeight - 250 - ((i - 1) * spacingY);
      let x = 330 + Math.sin(i * 0.7) * 160; 
      nodePositions.push({ lvl: i, x, y });

      if (i === 1) {
        pathGraphics.moveTo(x, y);
        innerPath.moveTo(x, y);
      } else {
        pathGraphics.lineTo(x, y);
        innerPath.lineTo(x, y);
      }
    }
    pathGraphics.strokePath();
    innerPath.strokePath();

    // 3. Draw Level Nodes & World Titles
    const worldNames = ["Lumen Meadow", "Crystal Valley", "Twilight Grove", "Starlight Peaks", "Mystic Clouds", "Cosmic Infinity"];
    
    nodePositions.forEach(pos => {
      this.createNode(pos.lvl, pos.x, pos.y, unlockedLvl, progress);

      if (pos.lvl % 20 === 1) {
         let wNum = Math.floor(pos.lvl / 20);
         let wName = worldNames[Math.min(wNum, worldNames.length - 1)];
         
         let titleBg = this.add.graphics().setDepth(1);
         titleBg.fillStyle(0x4a044e, 0.85);
         titleBg.fillRoundedRect(pos.x - 120, pos.y + 70, 240, 40, 20);
         titleBg.fillStyle(0xfbcfe8, 1);
         titleBg.fillRoundedRect(pos.x - 122, pos.y + 68, 244, 44, 22);
         titleBg.fillStyle(0x4a044e, 1);
         titleBg.fillRoundedRect(pos.x - 120, pos.y + 70, 240, 40, 20);

         this.add.text(pos.x, pos.y + 90, `WORLD ${wNum + 1}: ${wName}`, {
             fontSize: '14px', fontStyle: 'bold', color: '#fcd34d'
         }).setOrigin(0.5).setDepth(2);
      }
    });

    // 4. Modal Popup Construction
    this.createPopupUI();

    // 5. Drag/Swipe Scroll Listener
    this.setupScrolling();

    // 6. Auto-scroll to Current Level
    let targetY = worldHeight - 250 - ((unlockedLvl - 1) * spacingY);
    this.cameras.main.scrollY = Math.max(0, targetY - (1100 / 2));
  }

  createNode(lvl, x, y, unlockedLvl, progress) {
    let btnContainer = this.add.container(x, y).setDepth(2);
    let btnGfx = this.add.graphics();
    
    const isUnlocked = lvl <= unlockedLvl;
    const isCurrent = lvl === unlockedLvl;
    const starsEarned = progress.stars[lvl] || 0;

    if (isCurrent) {
      btnGfx.fillStyle(0x38bdf8, 1);
      btnGfx.fillCircle(0, 0, 48);
      btnGfx.fillStyle(0xbe185d, 1);
      btnGfx.fillCircle(0, 0, 42);
      
      this.tweens.add({
        targets: btnContainer, scaleX: 1.15, scaleY: 1.15, 
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    } else if (isUnlocked) {
      btnGfx.fillStyle(0xfbcfe8, 1);
      btnGfx.fillCircle(0, 0, 44);
      btnGfx.fillStyle(0xc084fc, 1);
      btnGfx.fillCircle(0, 0, 38);
    } else {
      btnGfx.fillStyle(0x475569, 1);
      btnGfx.fillCircle(0, 0, 40);
      btnGfx.fillStyle(0x1e293b, 1);
      btnGfx.fillCircle(0, 0, 36);
    }
    
    let lvlText = this.add.text(0, isUnlocked ? -8 : 0, isUnlocked ? lvl : '🔒', { 
      fontSize: isUnlocked ? '32px' : '28px', fontStyle: 'bold', color: '#FFFFFF' 
    }).setOrigin(0.5);

    btnContainer.add([btnGfx, lvlText]);

    if (isUnlocked && !isCurrent) {
      for (let s = 0; s < 3; s++) {
        const starColor = s < starsEarned ? '#FCD34D' : '#701a75';
        let star = this.add.text(-22 + (s * 22), 18, '★', {
          fontSize: '18px', color: starColor, stroke: '#FFFFFF', strokeThickness: s < starsEarned ? 1 : 0
        }).setOrigin(0.5);
        btnContainer.add(star);
      }
    }

    if (isUnlocked) {
      btnContainer.setSize(90, 90);
      btnContainer.setInteractive({ useHandCursor: true });

      btnContainer.on('pointerdown', () => { 
        if (!this.isDraggingMap && !this.isPopupOpen) btnContainer.setScale(0.9); 
      });
      btnContainer.on('pointerout', () => { 
        if (!isCurrent) btnContainer.setScale(1); 
      });
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
    // Popup container without setScrollFactor to preserve hitboxes
    this.popupContainer = this.add.container(330, 550).setDepth(200).setVisible(false);

    // Full-screen blocker behind popup
    let overlay = this.add.rectangle(0, 0, 660, 1100, 0x000000, 0.7).setInteractive();

    let panel = this.add.graphics();
    panel.fillStyle(0xfbcfe8, 1); panel.fillRoundedRect(-204, -204, 408, 408, 34);
    panel.fillStyle(0x4a044e, 1); panel.fillRoundedRect(-200, -200, 400, 400, 30);

    this.popupTitle = this.add.text(0, -140, 'LEVEL 1', { fontSize: '40px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    
    this.popupStars = [];
    for (let i = 0; i < 3; i++) {
        let star = this.add.text(-60 + (i * 60), -75, '★', { fontSize: '48px', color: '#701a75' }).setOrigin(0.5);
        this.popupStars.push(star);
    }

    this.popupTarget = this.add.text(0, 5, 'Target: 0', { fontSize: '24px', fontStyle: 'bold', color: '#fbcfe8' }).setOrigin(0.5);
    this.popupMoves = this.add.text(0, 45, 'Moves: 0', { fontSize: '24px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5);
    this.popupBest = this.add.text(0, 85, 'Unplayed', { fontSize: '20px', fontStyle: 'italic', color: '#a78bfa' }).setOrigin(0.5);

    // Flattened Play Button
    let playBorder = this.add.rectangle(0, 150, 204, 64, 0xfbcfe8).setOrigin(0.5);
    this.playBtn = this.add.rectangle(0, 150, 200, 60, 0xbe185d).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let playText = this.add.text(0, 150, 'PLAY', { fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);

    this.playBtn.on('pointerdown', () => {
      this.playBtn.setScale(0.95);
      playBorder.setScale(0.95);
      playText.setScale(0.95);
    });

    this.playBtn.on('pointerup', () => {
      this.playBtn.setScale(1);
      playBorder.setScale(1);
      playText.setScale(1);
      this.isPopupOpen = false;

      try {
        if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
          this.sound.context.resume();
        }
        initAudio(this);
      } catch (e) {}

      this.scene.start('GameScene');
    });

    // Close Button
    this.closeBtn = this.add.text(150, -150, '✖', { fontSize: '32px', color: '#fbcfe8' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerup', () => this.closePopup());

    this.popupContainer.add([
      overlay, panel, this.popupTitle, 
      ...this.popupStars, 
      this.popupTarget, this.popupMoves, this.popupBest, 
      playBorder, this.playBtn, playText, this.closeBtn
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
    this.popupContainer.setPosition(330, currentCamCenterY);
    
    this.popupContainer.setScale(0.8);
    this.popupContainer.setVisible(true);
    
    this.tweens.add({
        targets: this.popupContainer,
        scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut'
    });
  }

  closePopup() {
    this.tweens.add({
      targets: this.popupContainer,
      scaleX: 0.8, scaleY: 0.8, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => {
        this.popupContainer.setVisible(false);
        this.isPopupOpen = false;
      }
    });
  }
}
