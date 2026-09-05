// --- GAMEPLAY MECHANICS & LOGIC ---

// --- BOOSTER ACTIONS ---
function applyShuffle(scene) {
  if (gameState !== 'PLAYING') return;
  score -= 100; // New Price
  updateScoreUI(); 
  playPopSound();
  
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l && l.type !== FUSION_ORB_TYPE) {
        l.type = getSmartColor(r, c);
        l.name = LUMEN_CONFIGS[l.type].name; 
        l.color = LUMEN_CONFIGS[l.type].color;
        l.sprite.setTexture(`${l.name}_closed`);
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 2, 20);
      }
    }
  }
  checkDeadlock(scene);
}

function applyBomb(scene) {
  if (gameState !== 'PLAYING') return;
  isAnimating = true; 
  score -= 150; // New Price
  
  let destroyedCount = 0;
  // Pick a center point that allows a 5x5 explosion
  let tr = Phaser.Math.Between(2, GRID_ROWS-3); 
  let tc = Phaser.Math.Between(2, GRID_COLS-3);
  
  // UPGRADED: 5x5 Explosion Radius
  for(let r = Math.max(0, tr-2); r <= Math.min(GRID_ROWS-1, tr+2); r++){
    for(let c = Math.max(0, tc-2); c <= Math.min(GRID_COLS-1, tc+2); c++){
      let l = board[r][c];
      if(l) {
        destroyedCount++;
        if (l.floatTween) { l.floatTween.stop(); l.floatTween = null; }
        scene.tweens.killTweensOf(l.sprite);
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 6, 50);
        l.sprite.destroy(); 
        board[r][c] = null;
      }
    }
  }
  
  score += (destroyedCount * 30); // Reward player for the explosion
  updateScoreUI(); 
  playPopSound();
  scene.cameras.main.shake(250, 0.008); // Stronger screen shake
  scene.time.delayedCall(300, () => applyGravity(scene));
}

function applyBurst(scene) {
  if (gameState !== 'PLAYING') return;
  isAnimating = true; 
  score -= 250; // New Price
  
  // UPGRADED: Target TWO colors instead of one
  let targetType1 = Phaser.Math.Between(0, ACTIVE_COLORS - 1);
  let targetType2 = (targetType1 + 1) % ACTIVE_COLORS; 
  let destroyedCount = 0;

  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l && (l.type === targetType1 || l.type === targetType2)) {
        destroyedCount++;
        if (l.floatTween) { l.floatTween.stop(); l.floatTween = null; }
        scene.tweens.killTweensOf(l.sprite);
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 6, 50);
        l.sprite.destroy(); 
        board[r][c] = null;
      }
    }
  }
  
  score += (destroyedCount * 40); // Massive reward for sweeping two colors
  updateScoreUI(); 
  playPopSound();
  scene.cameras.main.shake(250, 0.008);
  scene.time.delayedCall(300, () => applyGravity(scene));
}

// --- CORE GRID LOGIC ---
function getSmartColor(r, c) {
  // CLUSTERING INCREASED TO 65%: This guarantees huge, obvious chains for early levels!
  if (Math.random() < 0.65) {
      let neighbors = [];
      if (r > 0 && board[r-1][c] && board[r-1][c].type !== FUSION_ORB_TYPE) neighbors.push(board[r-1][c].type);
      if (c > 0 && board[r][c-1] && board[r][c-1].type !== FUSION_ORB_TYPE) neighbors.push(board[r][c-1].type);
      if (neighbors.length > 0) return Phaser.Utils.Array.GetRandom(neighbors);
  }
  return Phaser.Math.Between(0, ACTIVE_COLORS - 1);
}

function spawnSpecificLumen(scene, r, c, type) {
  let cfg = type === FUSION_ORB_TYPE ? {name: 'fusion_orb', color: 0xc084fc, faceY: 0} : LUMEN_CONFIGS[type];
  let x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
  let y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
  let tex = type === FUSION_ORB_TYPE ? 'fusion_orb' : `${cfg.name}_closed`;
  let sprite = scene.add.image(x, y, tex).setDepth(2);
  let lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: y, floatTween: null };
  startFloating(scene, lumen);
  return lumen;
}

function spawnGrid(scene) {
  gameState = 'PLAYING'; 
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      board[r][c] = spawnSpecificLumen(scene, r, c, getSmartColor(r, c));
    }
  }
  checkDeadlock(scene);
}

function checkDeadlock(scene) {
  let movesExist = false;
  const dirs = [[0,1], [1,0], [1,1], [-1,1]]; 
  
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      if(!board[r][c] || board[r][c].type === FUSION_ORB_TYPE) continue;
      let type = board[r][c].type;
      for(let [dr, dc] of dirs) {
        let r2 = r + dr, c2 = c + dc, r3 = r + dr*2, c3 = c + dc*2;
        if(r3 >= 0 && r3 < GRID_ROWS && c3 >= 0 && c3 < GRID_COLS) {
           let n1 = board[r2][c2], n2 = board[r3][c3];
           if(n1 && n2 && (n1.type === type || n1.type === FUSION_ORB_TYPE) && (n2.type === type || n2.type === FUSION_ORB_TYPE)) {
              movesExist = true; break;
           }
        }
      }
      if(movesExist) break;
    }
    if(movesExist) break;
  }
  if(!movesExist) {
    scene.time.delayedCall(500, () => { applyShuffle(scene); });
  }
}

function startFloating(scene, lumen) {
  if (!lumen || !lumen.sprite) return;
  if (lumen.floatTween) { lumen.floatTween.stop(); lumen.floatTween = null; }
  scene.tweens.killTweensOf(lumen.sprite);
  lumen.sprite.setScale(1.0);
  lumen.sprite.y = lumen.baseY;

  let floatDist = lumen.type === FUSION_ORB_TYPE ? 6 : 4;
  lumen.floatTween = scene.tweens.add({
    targets: lumen.sprite, y: lumen.baseY - floatDist, scaleX: 1.02, scaleY: 0.98,
    duration: Phaser.Math.Between(1500, 2000), delay: Phaser.Math.Between(0, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
  });
}

function triggerRandomPeek(scene) {
  if (isAnimating || gameState !== 'PLAYING') return;
  const r = Phaser.Math.Between(0, GRID_ROWS - 1), c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];
  if (lumen && lumen.type !== FUSION_ORB_TYPE && !selectedLumens.includes(lumen)) {
    lumen.sprite.setTexture(`${lumen.name}_open`);
    scene.time.delayedCall(200, () => { 
      if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) lumen.sprite.setTexture(`${lumen.name}_closed`); 
    });
  }
}

// --- TOUCH & SELECTION CONTROLS ---
function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating || gameState !== 'PLAYING') return;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);
      if (dist < 45) { 
        if (!isDragging) {
          if (lumen.type === FUSION_ORB_TYPE) return; 
          isDragging = true; currentType = lumen.type; currentDirection = null; addLumenToChain(scene, lumen);
        } else {
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            const removed = selectedLumens.pop(); 
            if(selectedLumens.length === 1) currentDirection = null; 
            resetLumenVisual(scene, removed); drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            const last = selectedLumens[selectedLumens.length - 1];
            if (last.type === FUSION_ORB_TYPE) return;

            const rowDiff = lumen.row - last.row;
            const colDiff = lumen.col - last.col;

            // Permits horizontal, vertical, AND diagonal linking
            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
              if (lumen.type === currentType || lumen.type === FUSION_ORB_TYPE) {
                if (selectedLumens.length === 1) {
                  currentDirection = { r: rowDiff, c: colDiff };
                  addLumenToChain(scene, lumen);
                } else {
                  if (rowDiff === currentDirection.r && colDiff === currentDirection.c) {
                    addLumenToChain(scene, lumen);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function addLumenToChain(scene, lumen) {
  selectedLumens.push(lumen);
  if (lumen.floatTween) { lumen.floatTween.stop(); lumen.floatTween = null; }
  scene.tweens.killTweensOf(lumen.sprite);
  
  if (lumen.type !== FUSION_ORB_TYPE) lumen.sprite.setTexture(`${lumen.name}_open`);
  
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.25, scaleY: 1.25, duration: 150, ease: 'Back.easeOut' });
  
  playLinkSound(selectedLumens.length); 
  createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, 3, 20);
  drawLine();
}

function resetLumenVisual(scene, lumen) {
  if (lumen.type !== FUSION_ORB_TYPE) lumen.sprite.setTexture(`${lumen.name}_closed`);
  scene.tweens.killTweensOf(lumen.sprite);
  scene.tweens.add({ 
    targets: lumen.sprite, scaleX: 1.0, scaleY: 1.0, y: lumen.baseY,
    duration: 150, ease: 'Quad.easeOut', onComplete: () => startFloating(scene, lumen) 
  });
}

function drawLine() {
  lineLayer.clear(); lineGlowLayer.clear();
  if (selectedLumens.length < 2) return;
  
  const isFusion = selectedLumens[selectedLumens.length - 1].type === FUSION_ORB_TYPE;
  const activeColor = isFusion ? 0xc084fc : LUMEN_CONFIGS[currentType].color;
  const intensity = Math.min(selectedLumens.length / 6, 1);

  lineGlowLayer.lineStyle(16 + (intensity * 4), activeColor, 0.4); 
  lineGlowLayer.beginPath(); lineGlowLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);
  
  lineLayer.lineStyle(8 + (intensity * 2), 0xFFFFFF, 0.9); 
  lineLayer.beginPath(); lineLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);

  for (let i = 1; i < selectedLumens.length; i++) {
    lineGlowLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
    lineLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
  }
  lineGlowLayer.strokePath(); lineLayer.strokePath();
}

function createBurst(scene, x, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'particle').setTint(color).setDepth(11).setScale(Math.random() * 0.8 + 0.4);
    const angle = Math.random() * Math.PI * 2, dist = Math.random() * power + (power * 0.5);
    scene.tweens.add({ 
      targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0, scale: 0, 
      duration: Math.random() * 300 + 300, ease: 'Cubic.easeOut', onComplete: () => p.destroy() 
    });
  }
}

// --- COMBO RESOLUTION ---
function endConnection(scene) {
  if (!isDragging) return;
  isDragging = false; lineLayer.clear(); lineGlowLayer.clear(); currentDirection = null;

  const combo = selectedLumens.length;
  const hasFusionOrb = combo > 0 && selectedLumens[combo - 1].type === FUSION_ORB_TYPE;

  if (combo >= 3) {
    isAnimating = true; 
    movesRemaining--; 
    movesText.setText(`${movesRemaining}`);
    
    if (hasFusionOrb) {
      triggerFusionSequence(scene, currentType, selectedLumens);
    } else {
      score += combo * 25; 
      updateScoreUI(); 
      playPopSound(); 
      if (combo >= 4) scene.cameras.main.shake(100, 0.003); 

      let lastRow = selectedLumens[combo - 1].row;
      let lastCol = selectedLumens[combo - 1].col;

      selectedLumens.forEach((lumen) => {
        if (lumen.floatTween) { lumen.floatTween.stop(); lumen.floatTween = null; }
        scene.tweens.killTweensOf(lumen.sprite);
        scene.tweens.add({
          targets: lumen.sprite, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true,
          onComplete: () => { 
            createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, Math.min(6 + combo, 15), 60); 
            lumen.sprite.destroy(); 
          }
        });
        board[lumen.row][lumen.col] = null;
      });

      if (combo >= 5) {
        board[lastRow][lastCol] = spawnSpecificLumen(scene, lastRow, lastCol, FUSION_ORB_TYPE);
        createBurst(scene, board[lastRow][lastCol].sprite.x, board[lastRow][lastCol].sprite.y, 0xc084fc, 20, 80);
      }
      scene.time.delayedCall(200, () => applyGravity(scene));
    }
  } else { 
    selectedLumens.forEach(lumen => resetLumenVisual(scene, lumen)); 
  }
  selectedLumens = []; currentType = null;
}

// --- FUSION SEQUENCE ---
function triggerFusionSequence(scene, colorType, chain) {
  playFusionChargeSound();
  const orb = chain[chain.length - 1]; 
  const targetColorHex = LUMEN_CONFIGS[colorType].color;

  chain.forEach((lumen, index) => {
    if (lumen !== orb) {
      board[lumen.row][lumen.col] = null; 
      if (lumen.floatTween) { lumen.floatTween.stop(); lumen.floatTween = null; }
      scene.tweens.killTweensOf(lumen.sprite);
      scene.tweens.add({
        targets: lumen.sprite, x: orb.sprite.x, y: orb.sprite.y, scaleX: 0, scaleY: 0,
        duration: 350, delay: index * 80, ease: 'Cubic.easeIn',
        onComplete: () => lumen.sprite.destroy()
      });
    }
  });

  if (orb.floatTween) { orb.floatTween.stop(); orb.floatTween = null; }
  scene.tweens.killTweensOf(orb.sprite);
  scene.tweens.add({
    targets: orb.sprite, scaleX: 1.8, scaleY: 1.8, angle: 180,
    duration: 1000, ease: 'Sine.easeInOut'
  });

  let darkOverlay = scene.add.rectangle(330, 550, 660, 1100, 0x000000, 0).setDepth(1);
  scene.tweens.add({ targets: darkOverlay, fillAlpha: 0.5, duration: 800 });

  scene.time.delayedCall(1100, () => {
    playFusionExplosionSound();
    scene.cameras.main.shake(400, 0.015);
    createBurst(scene, orb.sprite.x, orb.sprite.y, targetColorHex, 40, 200);

    let clearedCount = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        let l = board[r][c];
        if (l && l.type === colorType) {
          clearedCount++;
          if (l.floatTween) { l.floatTween.stop(); l.floatTween = null; }
          scene.tweens.killTweensOf(l.sprite);
          createBurst(scene, l.sprite.x, l.sprite.y, l.color, 8, 60);
          l.sprite.destroy();
          board[r][c] = null;
        }
      }
    }
    
    score += (clearedCount * 50); 
    updateScoreUI();
    orb.sprite.destroy();
    board[orb.row][orb.col] = null;

    scene.tweens.add({ targets: darkOverlay, fillAlpha: 0, duration: 300, onComplete: () => darkOverlay.destroy() });
    scene.time.delayedCall(400, () => applyGravity(scene));
  });
}

// --- FIXED GRAVITY REFILL ---
function applyGravity(scene) {
  let longestAnimation = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let emptySlots = 0;
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (board[r][c] === null) {
        emptySlots++;
      } else if (emptySlots > 0) {
        let piece = board[r][c]; let newRow = r + emptySlots;
        board[newRow][c] = piece; board[r][c] = null; piece.row = newRow;
        const targetY = BOARD_OFFSET_Y + newRow * TILE_SIZE + TILE_SIZE / 2; piece.baseY = targetY;

        if (piece.floatTween) { piece.floatTween.stop(); piece.floatTween = null; }
        scene.tweens.killTweensOf(piece.sprite);

        const duration = 220 + (emptySlots * 35);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
          onComplete: () => {
            playBounceSound();
            scene.tweens.add({ targets: piece.sprite, scaleX: 1.12, scaleY: 0.88, duration: 50, yoyo: true, onComplete: () => startFloating(scene, piece) });
          }
        });
      }
    }

    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = getSmartColor(r, c);
      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

      let cfg = type === FUSION_ORB_TYPE ? {name: 'fusion_orb', color: 0xc084fc, faceY: 0} : LUMEN_CONFIGS[type];
      let tex = type === FUSION_ORB_TYPE ? 'fusion_orb' : `${cfg.name}_closed`;
      
      let startY = BOARD_OFFSET_Y - ((i + 1) * TILE_SIZE);
      let sprite = scene.add.image(targetX, startY, tex).setDepth(2);
      let lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: targetY, floatTween: null };
      board[r][c] = lumen;

      const duration = 300 + (i * 45);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
        onComplete: () => {
          playBounceSound();
          scene.tweens.add({ targets: sprite, scaleX: 1.12, scaleY: 0.88, duration: 50, yoyo: true, onComplete: () => startFloating(scene, lumen) });
        }
      });
    }
  }

  // --- IMMEDIATE WIN/LOSS EVALUATION ---
  scene.time.delayedCall(longestAnimation + 120, () => {
    isAnimating = false;
    
    // 1. Did they reach the score early? INSTANT WIN!
    if (score >= TARGET_SCORE) {
      triggerGameOver(scene);
    } 
    // 2. Did they run out of moves before reaching it? LOSS.
    else if (movesRemaining <= 0) {
      triggerGameOver(scene);
    } 
    // 3. Otherwise, keep playing!
    else {
      checkDeadlock(scene);
    }
  });
}

// --- VICTORY & DEFEAT HANDLING ---
function triggerGameOver(scene) {
  gameState = 'GAME_OVER';

  // Stars are now based on how efficiently you finished! (How many moves left over)
  let stars = 0;
  if (score >= TARGET_SCORE) {
      stars = 1; // Completed
      if (movesRemaining >= 3) stars = 2; // Finished fast
      if (movesRemaining >= 6) stars = 3; // Finished incredibly fast!
  }

  let isWin = stars > 0;

  // Save Progress
  if (isWin) {
    saveLevelProgress(currentLevel, score, stars);
  }

  showEndScreen(scene, isWin, stars, score);
}

function showEndScreen(scene, isWin, stars, finalScore) {
  // Dark overlay
  let overlay = scene.add.rectangle(330, 550, 660, 1100, 0x000000, 0).setDepth(100).setInteractive();
  scene.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 400 });

  // Main UI Panel
  let panelContainer = scene.add.container(330, 550).setDepth(101).setScale(0);
  let panel = scene.add.graphics();
  panel.fillStyle(0xfbcfe8, 1); panel.fillRoundedRect(-204, -224, 408, 448, 34);
  panel.fillStyle(0x4a044e, 1); panel.fillRoundedRect(-200, -220, 400, 440, 30);
  panelContainer.add(panel);

  // Win or Lose Title
  let titleText = isWin ? 'LEVEL COMPLETE!' : 'OUT OF MOVES';
  let titleColor = isWin ? '#34D399' : '#F43F5E';
  panelContainer.add(scene.add.text(0, -150, titleText, { fontSize: '36px', fontStyle: 'bold', color: titleColor }).setOrigin(0.5));

  // Draw 3 Stars
  for (let i = 0; i < 3; i++) {
    let starColor = i < stars ? '#FCD34D' : '#701a75';
    let starSize = i === 1 ? '70px' : '50px'; // Middle star is bigger
    let starY = i === 1 ? -75 : -65;
    let star = scene.add.text(-70 + (i * 70), starY, '★', { fontSize: starSize, color: starColor }).setOrigin(0.5);
    panelContainer.add(star);
  }

  // Show Scores
  panelContainer.add(scene.add.text(0, 10, 'FINAL SCORE', { fontSize: '20px', color: '#fbcfe8' }).setOrigin(0.5));
  panelContainer.add(scene.add.text(0, 45, `${finalScore}`, { fontSize: '42px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5));

  // Retrieve Best Score to show it
  let progress = getPlayerProgress();
  let best = progress.scores[currentLevel] || finalScore;
  panelContainer.add(scene.add.text(0, 95, `BEST SCORE: ${best}`, { fontSize: '18px', fontStyle: 'italic', color: '#a78bfa' }).setOrigin(0.5));

  // Continue / Try Again Button
  let btnContainer = scene.add.container(0, 160);
  let btnGfx = scene.add.graphics();
  btnGfx.fillStyle(0xfbcfe8, 1); btnGfx.fillRoundedRect(-102, -32, 204, 64, 22);
  btnGfx.fillStyle(isWin ? 0x059669 : 0xbe185d, 1); btnGfx.fillRoundedRect(-100, -30, 200, 60, 20);
  let btnText = scene.add.text(0, 0, isWin ? 'CONTINUE' : 'TRY AGAIN', { fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);
  
  btnContainer.add([btnGfx, btnText]);
  btnContainer.setSize(200, 60);
  btnContainer.setInteractive({ useHandCursor: true });

  btnContainer.on('pointerdown', () => btnContainer.setScale(0.95));
  btnContainer.on('pointerup', () => {
     btnContainer.setScale(1);
     scene.scene.start('LevelSelectScene'); 
  });

  panelContainer.add(btnContainer);

  scene.tweens.add({ targets: panelContainer, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut' });
}
