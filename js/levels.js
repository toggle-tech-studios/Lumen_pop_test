// --- HOME PAGE / INFINITE LEVEL MAP SCENE ---

class LevelSelectScene extends Phaser.Scene {
  constructor() { 
    super({ key: 'LevelSelectScene' }); 
  }

  create() {
    const progress = getPlayerProgress();
    const unlockedLvl = progress.unlockedLevel;
    
    // Procedurally render up to 10 levels BEYOND the player's current unlocked level
    const renderMax = unlockedLvl + 10; 
    const spacingY = 150; // Vertical space between levels
    
    // Calculate total height of the map based on how many levels are rendered
    const worldHeight = Math.max(1100, (renderMax * spacingY) + 500);

    // Setup scrollable camera boundaries
    this.cameras.main.setBounds(0, 0, 660, worldHeight);

    // 1. Seamless Scrolling Background
    // We use a TileSprite so your single game_bg.png repeats perfectly across the massive map
    this.add.tileSprite(330, worldHeight / 2, 660, worldHeight, 'game_bg').setDepth(-10);
    this.add.rectangle(330, worldHeight / 2, 660, worldHeight, 0x10052b, 0.4).setDepth(-9);

    // 2. Procedural Winding Path
    let pathGraphics = this.add.graphics().setDepth(0);
    pathGraphics.lineStyle(16, 0xfbcfe8, 0.5); // Outer glow path
    pathGraphics.beginPath();

    let innerPath = this.add.graphics().setDepth(0);
    innerPath.lineStyle(6, 0xFFFFFF, 0.9); // Inner bright path
    innerPath.beginPath();

    const nodePositions = [];
    for (let i = 1; i <= renderMax; i++) {
      // Math for organic winding! Moves up the screen and waves left/right.
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

      // Introduce a new World Name every 20 levels!
      if (pos.lvl % 20 === 1) {
         let wNum = Math.floor(pos.lvl / 20);
         let wName = worldNames[Math.min(wNum, worldNames.length - 1)];
         
         let titleBg = this.add.graphics().setDepth(1);
         titleBg.fillStyle(0x4a044e, 0.8);
         titleBg.fillRoundedRect(pos.x - 120, pos.y + 70, 240, 40, 20);
         titleBg.lineStyle(2, 0xfbcfe8, 1);
         titleBg.strokeRoundedRect(pos.x - 120, pos.y + 70, 240, 40, 20);

         this.add.text(pos.x, pos.y + 90, `WORLD ${wNum + 1}: ${wName}`, {
             fontSize: '14px', fontStyle: 'bold', color: '#fcd34d'
         }).setOrigin(0.5).setDepth(2);
      }
    });

    // 4. Level Start Popup UI (Hidden by default)
    this.createPopupUI();

    // 5. Mobile Drag/Swipe Scrolling Logic
    this.setupScrolling();

    // 6. Auto-scroll Camera to Current Level
    let targetY = worldHeight - 250 - ((unlockedLvl - 1) * spacingY);
    this.cameras.main.scrollY = targetY - (1100 / 2); // Center current level on screen
  }

  createNode(lvl, x, y, unlockedLvl, progress) {
    let btnContainer = this.add.container(x, y).setDepth(2);
    let btnGfx = this.add.graphics();
    
    const isUnlocked = lvl <= unlockedLvl;
    const isCurrent = lvl === unlockedLvl;
    const starsEarned = progress.stars[lvl] || 0;

    if (isCurrent) {
      // CURRENT LEVEL: Glowing, Pulsing Cyan/Pink
      btnGfx.fillStyle(0x38bdf8, 1);
      btnGfx.fillCircle(0, 0, 48);
      btnGfx.fillStyle(0xbe185d, 1);
      btnGfx.fillCircle(0, 0, 42);
      
      this.tweens.add({
        targets: btnContainer, scaleX: 1.15, scaleY: 1.15, 
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    } else if (isUnlocked) {
      // COMPLETED LEVEL: Solid Pink
      btnGfx.fillStyle(0xfbcfe8, 1);
      btnGfx.fillCircle(0, 0, 44);
      btnGfx.fillStyle(0xc084fc, 1);
      btnGfx.fillCircle(0, 0, 38);
    } else {
      // LOCKED LEVEL: Dim Gray
      btnGfx.fillStyle(0x475569, 1);
      btnGfx.fillCircle(0, 0, 40);
      btnGfx.fillStyle(0x1e293b, 1);
      btnGfx.fillCircle(0, 0, 36);
    }
    
    let lvlText = this.add.text(0, isUnlocked ? -8 : 0, isUnlocked ? lvl : '🔒', { 
      fontSize: isUnlocked ? '32px' : '28px', fontStyle: 'bold', color: '#FFFFFF' 
    }).setOrigin(0.5);

    btnContainer.add([btnGfx, lvlText]);

    // Draw Stars for Unlocked Levels
    if (isUnlocked && !isCurrent) {
      for (let s = 0; s < 3; s++) {
        const starColor = s < starsEarned ? '#FCD34D' : '#701a75';
        let star = this.add.text(-22 + (s * 22), 18, '★', {
          fontSize: '18px', color: starColor, stroke: '#FFFFFF', strokeThickness: s < starsEarned ? 1 : 0
        }).setOrigin(0.5);
        btnContainer.add(star);
      }
    }

    // Interactivity
    if (isUnlocked) {
      btnContainer.setSize(90, 90);
      btnContainer.setInteractive({ useHandCursor: true });

      btnContainer.on('pointerdown', () => { if (!this.isDraggingMap) btnContainer.setScale(0.9); });
      btnContainer.on('pointerout', () => { if (!isCurrent) btnContainer.setScale(1); });
      btnContainer.on('pointerup', () => {
        if (!this.isDraggingMap) {
          if (!isCurrent) btnContainer.setScale(1);
          initAudio(this);
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
      // Ignore scroll if touching the popup
      if (this.popupContainer && this.popupContainer.visible) return; 
      
      this.isDraggingMap = false; 
      startY = pointer.y; 
      camStartY = this.cameras.main.scrollY; 
    });
    
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown || (this.popupContainer && this.popupContainer.visible)) return;
      
      let distance = Math.abs(pointer.y - startY);
      if (distance > 10) { // Threshold to differentiate tap vs swipe
        this.isDraggingMap = true;
        this.cameras.main.scrollY = camStartY - (pointer.y - startY);
      }
    });
  }

  createPopupUI() {
    // A UI container fixed to the screen (doesn't scroll with map)
    this.popupContainer = this.add.container(330, 550).setDepth(100).setVisible(false).setScrollFactor(0);

    let overlay = this.add.rectangle(0, 0, 660, 1100, 0x000000, 0.7).setInteractive(); // Blocks clicks behind it
    
    let panel = this.add.graphics();
    panel.fillStyle(0xfbcfe8, 1); panel.fillRoundedRect(-204, -204, 408, 408, 34);
    panel.fillStyle(0x4a044e, 1); panel.fillRoundedRect(-200, -200, 400, 400, 30);

    this.popupTitle = this.add.text(0, -140, 'LEVEL 1', { fontSize: '42px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    
    this.popupStars = [];
    for(let i=0; i<3; i++) {
        let star = this.add.text(-60 + (i*60), -70, '★', { fontSize: '50px', color: '#701a75' }).setOrigin(0.5);
        this.popupStars.push(star);
        this.popupContainer.add(star);
    }

    this.popupTarget = this.add.text(0, 10, 'Target: 0', { fontSize: '24px', fontStyle: 'bold', color: '#fbcfe8' }).setOrigin(0.5);
    this.popupMoves = this.add.text(0, 50, 'Moves: 0', { fontSize: '24px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5);
    this.popupBest = this.add.text(0, 90, 'Best Score: 0', { fontSize: '20px', fontStyle: 'italic', color: '#a78bfa' }).setOrigin(0.5);

    // PLAY BUTTON
    let playBtnContainer = this.add.container(0, 150);
    let playBtnGfx = this.add.graphics();
    playBtnGfx.fillStyle(0xfbcfe8, 1); playBtnGfx.fillRoundedRect(-102, -32, 204, 64, 22);
    playBtnGfx.fillStyle(0xbe185d, 1); playBtnGfx.fillRoundedRect(-100, -30, 200, 60, 20);
    let playText = this.add.text(0, 0, 'PLAY', { fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    playBtnContainer.add([playBtnGfx, playText]);
    playBtnContainer.setSize(200, 60);
    playBtnContainer.setInteractive({ useHandCursor: true });
    
    playBtnContainer.on('pointerdown', () => playBtnContainer.setScale(0.95));
    playBtnContainer.on('pointerup', () => {
       playBtnContainer.setScale(1);
       this.scene.start('GameScene'); 
    });

    // CLOSE BUTTON
    let closeBtn = this.add.text(150, -150, '✖', { fontSize: '32px', color: '#fbcfe8' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => { this.popupContainer.setVisible(false); });

    this.popupContainer.add([overlay, panel, this.popupTitle, this.popupTarget, this.popupMoves, this.popupBest, playBtnContainer, closeBtn]);
  }

  openPopup(lvl, starsEarned, bestScore) {
    // Generate data mathematically using our infinite generator!
    let data = getLevelData(lvl); 

    // Apply data to config for GameScene
    currentLevel = lvl;
    TARGET_SCORE = data.target;
    movesRemaining = data.moves;
    ACTIVE_COLORS = data.colors;

    // Update Popup Texts
    this.popupTitle.setText(`LEVEL ${lvl}`);
    this.popupTarget.setText(`Target: ${data.target}`);
    this.popupMoves.setText(`Moves: ${data.moves}`);
    this.popupBest.setText(bestScore > 0 ? `Best Score: ${bestScore}` : 'Unplayed');

    // Update Popup Stars
    this.popupStars.forEach((star, index) => {
        star.setColor(index < starsEarned ? '#FCD34D' : '#701a75');
        star.setStroke('#FFFFFF', index < starsEarned ? 2 : 0);
    });

    this.popupContainer.setScale(0.8);
    this.popupContainer.setVisible(true);
    
    // Pop-in animation
    this.tweens.add({
        targets: this.popupContainer,
        scaleX: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut'
    });
  }
}
