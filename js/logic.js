// --- GAMEPLAY MECHANICS & LOGIC ---

// --- BOOSTER ACTIONS ---
function applyShuffle(scene) {
  score -= 200; updateScoreUI(); playPopSound();
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
  isAnimating = true; score -= 400; updateScoreUI(); playPopSound();
  let tr = Phaser.Math.Between(1, GRID_ROWS-2); let tc = Phaser.Math.Between(1, GRID_COLS-2);
  for(let r=tr-1; r<=tr+1; r++){
    for(let c=tc-1; c<=tc+1; c++){
      let l = board[r][c];
      if(l) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

function applyBurst(scene) {
  isAnimating = true; score -= 600; updateScoreUI(); playPopSound();
  let targetType = Phaser.Math.Between(0, ACTIVE_COLORS - 1);
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      let l = board[r][c];
      if(l && l.type === targetType) {
        if (l.floatTween) l.floatTween.stop();
        createBurst(scene, l.sprite.x, l.sprite.y, l.color, 5, 40);
        l.sprite.destroy(); board[r][c] = null;
      }
    }
  }
  scene.cameras.main.shake(100, 0.003);
  scene.time.delayedCall(200, () => applyGravity(scene));
}

// --- CORE GRID LOGIC (EASY SPAWNING) ---
function getSmartColor(r, c) {
  // High chance (45%) to copy a neighbor to ensure easy, obvious clusters for kids!
  if (Math.random() < 0.45) {
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
  if (lumen.floatTween) lumen.floatTween.stop();
  let floatDist = lumen.type === FUSION_ORB_TYPE ? 6 : 4; // Fusion orb floats higher
  lumen.floatTween = scene.tweens.add({
    targets: lumen.sprite, y: lumen.baseY - floatDist, scaleX: 1.02, scaleY: 0.98,
    duration: Phaser.Math.Between(1500, 2000), delay: Phaser.Math.Between(0, 800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
  });
}

function triggerRandomPeek(scene) {
  if (isAnimating) return;
  const r = Phaser.Math.Between(0, GRID_ROWS - 1), c = Phaser.Math.Between(0, GRID_COLS - 1);
  const lumen = board[r][c];
  if (lumen && lumen.type !== FUSION_ORB_TYPE && !selectedLumens.includes(lumen)) {
    lumen.sprite.setTexture(`${lumen.name}_open`);
    scene.time.delayedCall(200, () => { 
      if (lumen && lumen.sprite && !selectedLumens.includes(lumen)) lumen.sprite.setTexture(`${lumen.name}_closed`); 
    });
  }
}

// --- PLAYER INPUT & STRICT STRAIGHT-LINE LINKING ---
function handlePointerMove(scene, pointer) {
  if (!pointer.isDown || isAnimating) return;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const lumen = board[r][c];
      if (!lumen || !lumen.sprite) continue;

      // VERY forgiving touch radius (45px) for kids to easily trace lines!
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lumen.sprite.x, lumen.sprite.y);
      if (dist < 45) { 
        if (!isDragging) {
          if (lumen.type === FUSION_ORB_TYPE) return; // Cannot START a chain on an orb
          isDragging = true; currentType = lumen.type; currentDirection = null; addLumenToChain(scene, lumen);
        } else {
          // Backtracking undo
          if (selectedLumens.length > 1 && lumen === selectedLumens[selectedLumens.length - 2]) {
            const removed = selectedLumens.pop(); 
            if(selectedLumens.length === 1) currentDirection = null; 
            resetLumenVisual(scene, removed); drawLine();
          } else if (!selectedLumens.includes(lumen)) {
            
            const last = selectedLumens[selectedLumens.length - 1];
            if (last.type === FUSION_ORB_TYPE) return; // Cannot drag PAST an orb. Orb ends the chain.

            const rowDiff = lumen.row - last.row;
            const colDiff = lumen.col - last.col;

            // Must be adjacent
            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && !(rowDiff === 0 && colDiff === 0)) {
              // Must match color OR be a Fusion Orb
              if (lumen.type === currentType || lumen.type === FUSION_ORB_TYPE) {
                if (selectedLumens.length === 1) {
                  // The SECOND item locks in the strict straight line direction
                  currentDirection = { r: rowDiff, c: colDiff };
                  addLumenToChain(scene, lumen);
                } else {
                  // Third+ items MUST follow the exact strict direction
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
  if (lumen.floatTween) lumen.floatTween.pause();
  
  if (lumen.type !== FUSION_ORB_TYPE) {
    lumen.sprite.setTexture(`${lumen.name}_open`);
  }
  
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.25, scaleY: 1.25, duration: 150, ease: 'Back.easeOut' });
  
  playLinkSound(selectedLumens.length); 
  createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, 3, 20);
  drawLine();
}

function resetLumenVisual(scene, lumen) {
  if (lumen.type !== FUSION_ORB_TYPE) lumen.sprite.setTexture(`${lumen.name}_closed`);
  scene.tweens.add({ targets: lumen.sprite, scaleX: 1.0, scaleY: 1.0, duration: 150, ease: 'Quad.easeOut', onComplete: () => { if (lumen.floatTween) lumen.floatTween.resume(); } });
}

function drawLine() {
  lineLayer.clear(); lineGlowLayer.clear();
  if (selectedLumens.length < 2) return;
  
  // If the last item is a Fusion orb, use a magical purple line. Otherwise, use Lumen color.
  const isFusion = selectedLumens[selectedLumens.length - 1].type === FUSION_ORB_TYPE;
  const activeColor = isFusion ? 0xc084fc : LUMEN_CONFIGS[currentType].color;
  const intensity = Math.min(selectedLumens.length / 6, 1);

  lineGlowLayer.lineStyle(16 + (intensity * 4), activeColor, 0.4); lineGlowLayer.beginPath(); lineGlowLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);
  lineLayer.lineStyle(8 + (intensity * 2), 0xFFFFFF, 0.9); lineLayer.beginPath(); lineLayer.moveTo(selectedLumens[0].sprite.x, selectedLumens[0].sprite.y);

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
    scene.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0, scale: 0, duration: Math.random() * 300 + 300, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
  }
}

// --- COMBO END & MAGICAL FUSION SEQUENCE ---
function endConnection(scene) {
  if (!isDragging) return;
  isDragging = false; lineLayer.clear(); lineGlowLayer.clear(); currentDirection = null;

  const combo = selectedLumens.length;
  const hasFusionOrb = combo > 0 && selectedLumens[combo - 1].type === FUSION_ORB_TYPE;

  if (combo >= 3) {
    isAnimating = true; movesRemaining--; movesText.setText(`${movesRemaining}`);
    
    if (hasFusionOrb) {
      triggerFusionSequence(scene, currentType, selectedLumens);
    } else {
      score += combo * 25; updateScoreUI(); playPopSound(); 
      if (combo >= 4) scene.cameras.main.shake(100, 0.003); 

      let lastRow = selectedLumens[combo - 1].row;
      let lastCol = selectedLumens[combo - 1].col;

      selectedLumens.forEach((lumen) => {
        if (lumen.floatTween) lumen.floatTween.stop();
        scene.tweens.add({
          targets: lumen.sprite, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true,
          onComplete: () => { createBurst(scene, lumen.sprite.x, lumen.sprite.y, lumen.color, Math.min(6 + combo, 15), 60); lumen.sprite.destroy(); }
        });
        board[lumen.row][lumen.col] = null;
      });

      // 🎁 SURPRISE REWARD! 5+ Combos spawn a Fusion Orb at the end of the line!
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

// 💥 THE FUSION ORB EXPLOSION CINEMATIC 💥
function triggerFusionSequence(scene, colorType, chain) {
  playFusionChargeSound();
  const orb = chain[chain.length - 1]; 
  const targetColorHex = LUMEN_CONFIGS[colorType].color;

  // Phase 1: Absorption (Suck chain into Orb)
  chain.forEach((lumen, index) => {
    if (lumen !== orb) {
      board[lumen.row][lumen.col] = null; 
      scene.tweens.add({
        targets: lumen.sprite, x: orb.sprite.x, y: orb.sprite.y, scaleX: 0, scaleY: 0,
        duration: 350, delay: index * 80, ease: 'Cubic.easeIn',
        onComplete: () => lumen.sprite.destroy()
      });
    }
  });

  // Phase 2: Charging Orb (Grows huge and pulses)
  scene.tweens.add({
    targets: orb.sprite, scaleX: 1.8, scaleY: 1.8, angle: 180,
    duration: 1000, ease: 'Sine.easeInOut'
  });

  // Darken background for cinematic effect
  let darkOverlay = scene.add.rectangle(330, 550, 660, 1100, 0x000000, 0).setDepth(1);
  scene.tweens.add({ targets: darkOverlay, fillAlpha: 0.5, duration: 800 });

  // Phase 3: Explosion! (Clears all matched colors off the entire board)
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
          if (l.floatTween) l.floatTween.stop();
          createBurst(scene, l.sprite.x, l.sprite.y, l.color, 8, 60);
          l.sprite.destroy();
          board[r][c] = null;
        }
      }
    }
    
    score += (clearedCount * 50); // Big bonus points!
    updateScoreUI();
    orb.sprite.destroy();
    board[orb.row][orb.col] = null;

    scene.tweens.add({ targets: darkOverlay, fillAlpha: 0, duration: 300, onComplete: () => darkOverlay.destroy() });

    // Phase 4: Cascade
    scene.time.delayedCall(400, () => applyGravity(scene));
  });
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
      let targetY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;
      board[r][c] = spawnSpecificLumen(scene, r, c, type);
      
      // Instantly move it above the board and tween it down
      board[r][c].sprite.y = BOARD_OFFSET_Y - (i + 1) * TILE_SIZE; 
      
      const duration = 350 + (i * 60);
      if (duration > longestAnimation) longestAnimation = duration;

      scene.tweens.add({
        targets: board[r][c].sprite, y: targetY, duration: duration, ease: 'Cubic.easeIn',
        onComplete: () => { playBounceSound(); scene.tweens.add({ targets: board[r][c].sprite, scaleX: 1.15, scaleY: 0.85, duration: 60, yoyo: true, onComplete: () => startFloating(scene, board[r][c]) }); }
      });
    }
  }
  
  scene.time.delayedCall(longestAnimation + 100, () => { 
    isAnimating = false; 
    checkDeadlock(scene);
  });
}
