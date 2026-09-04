// --- GAMEPLAY MECHANICS & LOGIC ---

// --- BOOSTER ACTIONS ---
function applyShuffle(scene) {
  score -= 200; 
  updateScoreUI(); 
  playPopSound();
  
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l) {
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
  isAnimating = true; 
  score -= 400; 
  updateScoreUI(); 
  playPopSound();
  
  let tr = Phaser.Math.Between(1, GRID_ROWS-2); 
  let tc = Phaser.Math.Between(1, GRID_COLS-2);
  
  for(let r=tr-1; r<=tr+1; r++){
    for(let c=tc-1; c<=tc+1; c++){
      let l = board[r][c];
      if(l) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); 
        board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

function applyBurst(scene) {
  isAnimating = true; 
  score -= 600; 
  updateScoreUI(); 
  playPopSound();
  
  let targetType = Phaser.Math.Between(0, ACTIVE_COLORS - 1);
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l && l.type === targetType) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); 
        board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

// --- CORE GRID LOGIC ---
function getSmartColor(r, c) {
  // 30% chance to clone neighbor's color for easy straight-line combos
  if (Math.random() < 0.30) {
      if (r < GRID_ROWS - 1 && board[r+1] && board[r+1][c]) return board[r+1][c].type;
      if (c > 0 && board[r] && board[r][c-1]) return board[r][c-1].type;
  }
  return Phaser.Math.Between(0, ACTIVE_COLORS - 1);
}

function spawnGrid(scene) {
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const type = getSmartColor(r, c);
      const cfg = LUMEN_CONFIGS[type];
      const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
      const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      const sprite = scene.add.image(x, y, `${cfg.name}_closed`).setDepth(2);
      const lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: y, floatTween: null };
      startFloating(scene, lumen); 
      board[r][c] = lumen;
    }
  }
  checkDeadlock(scene);
}

function checkDeadlock(scene) {
  let movesExist = false;
  const dirs = [[0,1], [1,0], [1,1], [-1,1]]; 
  
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      if(!board[r][c]) continue;
      let type = board[r][c].type;
      for(let [dr, dc] of dirs) {
        let r2 = r + dr, c2 = c + dc, r3 = r + dr*2, c3 = c + dc*2;
        if(r3 >= 0 && r3 < GRID_ROWS && c3 >= 0 && c3 < GRID_COLS) {
           if(board[r2][c2] && board[r3][c3] && board[r2][c2].type === type && board[r3][c3].type === type) {
              movesExist = true; 
              break;
           }
        }
      }
      if(movesExist) break;
    }
    if(movesExist) break;
  }
  
  // If literally zero straight-line matches exist, force a free shuffle
  if(!movesExist) {
    scene.time.delayedCall(500, () => { score += 200; applyShuffle(scene); });
  }
}

function startFloating(scene, lumen) {
  if (lumen.floatTween) lumen.floatTween.stop();
  lumen.floatTween = scene.tweens.add({
    targets: lumen.sprite, y: lumen.baseY - 4, scaleX: 1.02, scaleY: 0.98,
    duration: Phaser.Math.Between(1500, 2000), delay: Phaser.Math.Between(0, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
  });
}

function triggerRandomPeek(scene) {
  if (isAnimating) return;
  const r = Phaser.Math.Between(0, GRID_ROWS - 1), c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];
  if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) {
    lumen.sprite.setTexture(`${lumen.name}_open`);
    scene.time.delayedCall(200, () => { 
      if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) lumen.sprite.setTexture(`${lumen.name}_closed`); 
    });
  }
}

// --- PLAYER INPUT & LINKING ---
function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating) return;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);
      if (dist < 38) { 
        if (!isDragging) {
          isDragging = true; currentType = lumen.type; currentDirection = null; addLumenToChain(scene, lumen);
        } else if (lumen.type === currentType) {
          
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            // Undo connection
            const removed = selectedLumens.pop(); 
            if(selectedLumens.length === 1) currentDirection = null; 
            resetLumenVisual(scene, removed); drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            // Check for straight line validation
            const last = selectedLumens[selectedLumens.length - 1];
            const rowDiff = lumen.row - last.row;
            const colDiff = lumen.col - last.col;

            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
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

function addLumenToChain(scene, lumen) {
  selectedLumens.push(lumen);
  if (lumen.floatTween) lumen.floatTween.pause();
  lumen.sprite.setTexture(`${lumen.name}_open`);
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.25, scaleY: 1.25, duration: 150, ease: 'Back.easeOut' });
  
  playLinkSound(selectedLumens.length); 
  createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, 3, 20);
  drawLine();
}

function resetLumenVisual(scene, lumen) {
  lumen.sprite.setTexture(`${lumen.name}_closed`);
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.0, scaleY: 1.0, duration: 150, ease: 'Quad.easeOut', onComplete: () => { if (lumen.floatTween) lumen.floatTween.resume(); } });
}

function drawLine() {
  lineLayer.clear(); 
  lineGlowLayer.clear();
  
  if (selectedLumens.length < 2) return;
  
  const activeColor = LUMEN_CONFIGS[currentType].color;
  const intensity = Math.min(selectedLumens.length / 6, 1);

  lineGlowLayer.lineStyle(16 + (intensity * 4), activeColor, 0.4); 
  lineGlowLayer.beginPath(); 
  lineGlowLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);
  
  lineLayer.lineStyle(8 + (intensity * 2), 0xFFFFFF, 0.9); 
  lineLayer.beginPath(); 
  lineLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);

  for (let i = 1; i < selectedLumens.length; i++) {
    lineGlowLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
    lineLayer.lineTo(selectedLumens[i].sprite.x, selectedLumens[i].sprite.y);
  }
  
  lineGlowLayer.strokePath(); 
  lineLayer.strokePath();
}

function createBurst(scene, x, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'particle').setTint(color).setDepth(11).setScale(Math.random() * 0.8 + 0.4);
    const angle = Math.random() * Math.PI * 2, dist = Math.random() * power + (power * 0.5);
    scene.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0, scale: 0, duration: Math.random() * 300 + 300, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

function endConnection(scene) {
  if (!isDragging) return;
  isDragging = false; 
  lineLayer.clear(); 
  lineGlowLayer.clear(); 
  currentDirection = null;

  if (selectedLumens.length >= 3) {
    isAnimating = true; 
    movesRemaining--; 
    movesText.setText(`${movesRemaining}`);
    
    score += selectedLumens.length * 25; 
    updateScoreUI(); 
    playPopSound(); 

    const combo = selectedLumens.length;
    if (combo >= 4) scene.cameras.main.shake(100, 0.003); 

    selectedLumens.forEach((lumen) => {
      if (lumen.floatTween) lumen.floatTween.stop();
      scene.tweens.add({
        targets: lumen.sprite, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true,
        onComplete: () => { 
          createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, Math.min(6 + combo, 15), 60); 
          lumen.sprite.destroy(); 
        }
      });
      board[lumen.row][lumen.col] = null;
    });
    scene.time.delayedCall(200, () => applyGravity(scene));
  } else { 
    selectedLumens.forEach(lumen => resetLumenVisual(scene, lumen)); 
  }
  selectedLumens = []; 
  currentType = null;
}

function applyGravity(scene) {
  let longestAnimation = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    let emptySlots = 0;
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (board[r][c] === null) { emptySlots++; } 
      else if (emptySlots > 0) {
        let piece = board[r][c]; let newRow = r + emptySlots;
        board[newRow][c] = piece; board[r][c] = null; piece.row = newRow;
        const targetY = BOARD_OFFSET_Y + newRow * TILE_SIZE + TILE_SIZE / 2; piece.baseY = targetY;
        if (piece.floatTween) piece.floatTween.stop();

        const duration = 250 + (emptySlots * 40);
        if (duration > longestAnimation) longestAnimation = duration;

        scene.tweens.add({
          targets: piece.sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
          onComplete: () => { playBounceSound(); scene.tweens.add({ targets: piece.sprite, scaleX: 1.15, scaleY: 0.85, duration: 60, yoyo: true, onComplete: () => startFloating(scene, piece) }); }
        });
      }
    }

    for (let i = 0; i < emptySlots; i++) {
      let r = emptySlots - 1 - i;
      let type = getSmartColor(r, c); 
      let cfg = LUMEN_CONFIGS[type];
      let targetX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2; let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      let sprite = scene.add.image(targetX, BOARD_OFFSET_Y - (i + 1) * TILE_SIZE, `${cfg.name}_closed`).setDepth(2);
      let lumen = { sprite, type, name: cfg.name, color: cfg.color, row: r, col: c, baseY: targetY, floatTween: null };
      board[r][c] = lumen;

      const duration = 350 + (i * 60);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
        onComplete: () => { playBounceSound(); scene.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 0.85, duration: 60, yoyo: true, onComplete: () => startFloating(scene, lumen) }); }
      });
    }
  }
  
  scene.time.delayedCall(longestAnimation + 100, () => { 
    isAnimating = false; 
    checkDeadlock(scene);
  });
}
