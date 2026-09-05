// --- levels.js ---

class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelSelectScene' }); }

  create() {
    if (!this.sound.get('bgm_home') || !this.sound.get('bgm_home').isPlaying) {
        this.sound.stopAll(); this.sound.play('bgm_home', { loop: true, volume: 0.5 });
    }

    this.isPopupOpen = false;
    const progress = getPlayerProgress();
    const unlockedLvl = progress.unlockedLevel;
    
    let renderMax = 50;
    let threshold = 40;
    while (unlockedLvl >= threshold) { renderMax += 50; threshold += 50; }
    
    const spacingY = 160;
    // FIX: Perfected map height calculation
    const worldHeight = Math.max(GAME_HEIGHT, (renderMax * spacingY) + GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, worldHeight);

    const biomesCount = Math.ceil(renderMax / 10);
    const biomeHeight = 10 * spacingY;
    
    // FIX: Anchors backgrounds to the absolute bottom (0.5, 1) to eliminate the black gap
    for (let b = 0; b < biomesCount; b++) {
        let bgIndex = (b % 10) + 1; 
        let bottomY = worldHeight - (b * biomeHeight);
        
        let bg = this.add.image(GAME_WIDTH / 2, bottomY, `bg_level_${bgIndex}`);
        bg.setOrigin(0.5, 1); // Anchored cleanly to the bottom
        bg.setDisplaySize(GAME_WIDTH, biomeHeight + 50); // Overlap slightly to hide seams
        bg.setDepth(-10);
    }

    let pathGraphics = this.add.graphics().setDepth(-2);
    pathGraphics.lineStyle(12, 0xffffff, 0.8);
    pathGraphics.beginPath();

    const nodePositions = [];
    for (let i = 1; i <= renderMax; i++) {
      let y = worldHeight - (GAME_HEIGHT / 2) - ((i - 1) * spacingY);
      let x = (GAME_WIDTH / 2) + Math.sin(i * 0.7) * 110; 
      nodePositions.push({ lvl: i, x, y });
      if (i === 1) pathGraphics.moveTo(x, y); else pathGraphics.lineTo(x, y);
    }
    pathGraphics.strokePath();

    nodePositions.forEach(pos => { this.createNode(pos.lvl, pos.x, pos.y, unlockedLvl, progress); });
    this.createPopupUI();
    this.setupScrolling();

    let targetY = worldHeight - (GAME_HEIGHT / 2) - ((unlockedLvl - 1) * spacingY);
    this.cameras.main.scrollY = Math.max(0, targetY - (GAME_HEIGHT / 2));
  }

  createNode(lvl, x, y, unlockedLvl, progress) {
    const isUnlocked = lvl <= unlockedLvl;
    const isCurrent = lvl === unlockedLvl;
    const starsEarned = progress.stars[lvl] || 0;

    let btnContainer = this.add.container(x, y).setDepth(2);
    let nodeImg = this.add.image(0, 0, isUnlocked ? 'node_active' : 'node_locked').setDisplaySize(80, 80);
    
    let lvlText = this.add.text(0, isUnlocked ? -6 : 0, isUnlocked ? lvl : '🔒', { 
      fontSize: isUnlocked ? '30px' : '24px', fontStyle: 'bold', color: '#FFFFFF' 
    }).setOrigin(0.5);

    btnContainer.add([nodeImg, lvlText]);

    if (isCurrent) {
      this.tweens.add({ targets: btnContainer, scaleX: 1.15, scaleY: 1.15, duration: 800, yoyo: true, repeat: -1 });
    }

    if (isUnlocked && !isCurrent) {
      for (let s = 0; s < 3; s++) {
        let star = this.add.text(-22 + (s * 22), 26, '★', {
          fontSize: '20px', color: s < starsEarned ? '#FCD34D' : '#9ca3af', stroke: '#111827', strokeThickness: 3
        }).setOrigin(0.5);
        btnContainer.add(star);
      }
    }

    if (isUnlocked) {
      btnContainer.setSize(80, 80);
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
    let startY = 0; let camStartY = 0;
    this.input.on('pointerdown', (pointer) => {
      if (this.isPopupOpen) return;
      this.isDraggingMap = false; startY = pointer.y; camStartY = this.cameras.main.scrollY; 
    });
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown || this.isPopupOpen) return;
      if (Math.abs(pointer.y - startY) > 8) {
        this.isDraggingMap = true;
        this.cameras.main.scrollY = camStartY - (pointer.y - startY);
      }
    });
  }

  createPopupUI() {
    this.popupContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200).setVisible(false);
    let overlay = this.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.7).setInteractive();
    let panel = this.add.image(0, 0, 'popup_level_select').setDisplaySize(320, 340);

    this.popupTitle = this.add.text(0, -100, 'LEVEL 1', { fontSize: '32px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
    
    this.popupStars = [];
    for (let i = 0; i < 3; i++) {
        let star = this.add.text(-50 + (i * 50), -35, '★', { fontSize: '46px', color: '#701a75' }).setOrigin(0.5);
        this.popupStars.push(star);
    }

    this.popupTarget = this.add.text(0, 25, 'Target: 0', { fontSize: '22px', fontStyle: 'bold', color: '#fbcfe8' }).setOrigin(0.5);
    this.popupMoves = this.add.text(0, 55, 'Moves: 0', { fontSize: '22px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5);
    this.popupBest = this.add.text(0, 85, 'Unplayed', { fontSize: '18px', fontStyle: 'italic', color: '#a78bfa' }).setOrigin(0.5);

    this.playZone = this.add.zone(0, 125, 180, 60).setInteractive({ useHandCursor: true });
    let playText = this.add.text(0, 125, 'PLAY', { fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#be185d', strokeThickness: 4 }).setOrigin(0.5);

    this.playZone.on('pointerdown', () => { playText.setScale(0.9); });
    this.playZone.on('pointerup', () => {
      playText.setScale(1); this.isPopupOpen = false; this.scene.start('GameScene');
    });

    this.closeBtn = this.add.text(125, -135, '✖', { fontSize: '32px', color: '#fbcfe8' }).setOrigin(0.5).setInteractive();
    this.closeBtn.on('pointerup', () => this.closePopup());

    this.popupContainer.add([overlay, panel, this.popupTitle, ...this.popupStars, this.popupTarget, this.popupMoves, this.popupBest, this.playZone, playText, this.closeBtn]);
  }

  openPopup(lvl, starsEarned, bestScore) {
    this.isPopupOpen = true;
    let data = getLevelData(lvl); 
    currentLevel = lvl; TARGET_SCORE = data.target; movesRemaining = data.moves; ACTIVE_COLORS = data.colors;

    this.popupTitle.setText(`LEVEL ${lvl}`);
    this.popupTarget.setText(`Target: ${data.target}`);
    this.popupMoves.setText(`Moves: ${data.moves}`);
    this.popupBest.setText(bestScore > 0 ? `Best Score: ${bestScore}` : 'Unplayed');

    this.popupStars.forEach((star, index) => {
        star.setColor(index < starsEarned ? '#FCD34D' : '#701a75');
        star.setStroke('#FFFFFF', index < starsEarned ? 2 : 0);
    });

    this.popupContainer.setPosition(GAME_WIDTH / 2, this.cameras.main.scrollY + (this.cameras.main.height / 2));
    this.popupContainer.setScale(0.7); this.popupContainer.setVisible(true);
    this.tweens.add({ targets: this.popupContainer, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  closePopup() {
    this.tweens.add({ targets: this.popupContainer, scale: 0.7, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => { this.popupContainer.setVisible(false); this.isPopupOpen = false; }
    });
  }
}
