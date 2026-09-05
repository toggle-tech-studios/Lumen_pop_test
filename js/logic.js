// --- logic.js ---

let grid = [];
let isDragging = false;
let linkedLumens = [];
let currentLinkColor = -1;
let gameSceneRef = null;
let isGameOver = false;
let activeBooster = null;
let isAnimating = false; // Locks input during animations to prevent state corruption

function initGameLogic(scene) {
    gameSceneRef = scene;
    isGameOver = false;
    isDragging = false;
    isAnimating = false;
    linkedLumens = [];
    activeBooster = null;
    score = 0;
    
    generateGrid();

    scene.input.on('pointerup', () => {
        if (!isGameOver && isDragging) {
            handlePointerUp(scene);
        }
    });

    scene.input.on('pointermove', (pointer) => {
        if (!isGameOver && isDragging) {
            if (typeof drawConnectionLines === 'function') {
                drawConnectionLines(scene, pointer);
            }
        }
    });
}

function generateGrid() {
    grid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        let row = [];
        for (let c = 0; c < GRID_COLS; c++) {
            row.push(createRandomLumen());
        }
        grid.push(row);
    }
}

function createRandomLumen() {
    if (Math.random() < 0.02) {
        return { type: 99 };
    }
    let randomType = Math.floor(Math.random() * ACTIVE_COLORS);
    return { type: randomType };
}

function handlePointerDown(scene, r, c) {
    if (isGameOver || isAnimating) return;

    if (activeBooster === 'bomb' || activeBooster === 'burst') {
        handleBoosterTarget(scene, r, c);
        return;
    }

    let lumen = grid[r][c];
    if (lumen) {
        isDragging = true;
        currentLinkColor = lumen.type;
        linkedLumens = [{ r, c }];
        
        if (typeof updateLumenVisuals === 'function') updateLumenVisuals(scene);
        if (typeof drawConnectionLines === 'function') drawConnectionLines(scene, scene.input.activePointer);
    }
}

function handlePointerOver(scene, r, c) {
    if (isGameOver || !isDragging || activeBooster || isAnimating) return;

    let lumen = grid[r][c];
    if (!lumen) return;

    let existingIndex = linkedLumens.findIndex(l => l.r === r && l.c === c);
    
    if (existingIndex !== -1) {
        if (existingIndex === linkedLumens.length - 2) {
            linkedLumens.pop();
            currentLinkColor = grid[linkedLumens[0].r][linkedLumens[0].c].type; 
            for (let i = 1; i < linkedLumens.length; i++) {
                let t = grid[linkedLumens[i].r][linkedLumens[i].c].type;
                if (t !== 99 && currentLinkColor === 99) currentLinkColor = t;
            }
            if (typeof updateLumenVisuals === 'function') updateLumenVisuals(scene);
            if (typeof drawConnectionLines === 'function') drawConnectionLines(scene, scene.input.activePointer);
        }
        return;
    }

    let last = linkedLumens[linkedLumens.length - 1];
    let isAdjacent = Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1;

    if (isAdjacent && (lumen.type === currentLinkColor || lumen.type === 99 || currentLinkColor === 99)) {
        linkedLumens.push({ r, c });
        if (currentLinkColor === 99 && lumen.type !== 99) {
            currentLinkColor = lumen.type; 
        }
        if (typeof updateLumenVisuals === 'function') updateLumenVisuals(scene);
        if (typeof playLinkSound === 'function') {
            try { playLinkSound(scene); } catch (e) {}
        }
    }
}

function handlePointerUp(scene) {
    isDragging = false;
    
    if (linkedLumens.length >= 3) {
        processMatches(scene);
        movesRemaining--;
        scene.movesText.setText(`MOVES\n${movesRemaining}`);
    } else {
        linkedLumens = [];
        if (typeof updateLumenVisuals === 'function') updateLumenVisuals(scene);
        if (typeof drawConnectionLines === 'function') drawConnectionLines(scene);
    }
}

function processMatches(scene) {
    isAnimating = true;

    let points = linkedLumens.length * 10;
    if (linkedLumens.length >= 5) points += 50; 
    if (linkedLumens.length >= 8) points += 100;

    updateScore(points);
    if (typeof playPopSound === 'function') {
        try { playPopSound(scene); } catch (e) {}
    }

    linkedLumens.forEach(pos => {
        if (typeof playPopAnimation === 'function') playPopAnimation(scene, pos.r, pos.c, grid[pos.r][pos.c].type);
        grid[pos.r][pos.c] = null; 
    });

    linkedLumens = [];
    if (typeof drawConnectionLines === 'function') drawConnectionLines(scene);
    
    scene.time.delayedCall(200, () => applyGravity(scene));
}

function applyGravity(scene) {
    let dropped = false;
    const spriteSize = Math.floor(TILE_SIZE * 0.72);

    // 1. Shift falling Lumens down into vacant cells
    for (let c = 0; c < GRID_COLS; c++) {
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
            if (grid[r][c] === null) {
                for (let k = r - 1; k >= 0; k--) {
                    if (grid[k][c] !== null) {
                        grid[r][c] = grid[k][c];
                        grid[k][c] = null;
                        
                        let sprite = lumenSprites[k][c];
                        lumenSprites[r][c] = sprite;
                        lumenSprites[k][c] = null;
                        
                        if (sprite) {
                            sprite.gridRow = r;
                            let newY = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
                            if (typeof animateLumenDrop === 'function') animateLumenDrop(scene, r, c, newY, 0);
                        }
                        
                        dropped = true;
                        break;
                    }
                }
            }
        }
    }

    // 2. Spawn new Lumens from top to fill remaining empty cells
    let maxDelay = 0;
    for (let c = 0; c < GRID_COLS; c++) {
        let emptySpaces = 0;
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
            if (grid[r][c] === null) emptySpaces++;
        }
        
        for (let r = 0; r < emptySpaces; r++) {
            grid[r][c] = createRandomLumen();
            
            let x = BOARD_OFFSET_X + (c * TILE_SIZE) + (TILE_SIZE / 2);
            let targetY = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
            let startY = targetY - GAME_HEIGHT; 
            
            let textureKey = grid[r][c].type === 99 ? 'fusion_orb' : LUMEN_TYPES[grid[r][c].type].textureClosed;
            
            let sprite = scene.add.image(x, startY, textureKey)
                .setDisplaySize(spriteSize, spriteSize)
                .setDepth(2)
                .setInteractive({ useHandCursor: true });
                
            sprite.gridRow = r;
            sprite.gridCol = c;
            sprite.on('pointerdown', () => handlePointerDown(scene, sprite.gridRow, sprite.gridCol));
            sprite.on('pointerover', () => handlePointerOver(scene, sprite.gridRow, sprite.gridCol));
            
            lumenSprites[r][c] = sprite;
            
            let delay = r * 50;
            if (delay > maxDelay) maxDelay = delay;
            if (typeof animateLumenDrop === 'function') animateLumenDrop(scene, r, c, targetY, delay);
            dropped = true;
        }
    }

    // Unlock interactions once all drop tweens complete
    scene.time.delayedCall(maxDelay + 450, () => {
        if (typeof updateLumenVisuals === 'function') updateLumenVisuals(scene);
        checkWinLossConditions(scene);
        isAnimating = false;
    });
}

function updateScore(amount) {
    score = Math.max(0, score + amount);
    if (gameSceneRef && gameSceneRef.scoreText) {
        gameSceneRef.scoreText.setText(`SCORE: ${score}`);
    }
}

function activateBooster(scene, type) {
    if (isGameOver || isAnimating) return;
    
    let boosterData = BOOSTERS[type];
    
    if (type === 'shuffle') {
        updateScore(-boosterData.scorePenalty);
        activeBooster = null;
        
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (lumenSprites[r][c]) lumenSprites[r][c].destroy();
            }
        }
        generateGrid();
        if (typeof drawLumens === 'function') drawLumens(scene);
        if (typeof playPopSound === 'function') {
            try { playPopSound(scene); } catch(e){}
        }
    } else {
        activeBooster = type;
        scene.cameras.main.flash(200, 251, 207, 232); 
    }
}

function handleBoosterTarget(scene, centerR, centerC) {
    let type = activeBooster;
    activeBooster = null; 
    let toDestroy = [];
    let targetLumen = grid[centerR][centerC];
    
    if (!targetLumen) return;

    isAnimating = true;
    let boosterData = BOOSTERS[type];
    updateScore(-boosterData.scorePenalty);

    if (type === 'bomb') {
        for (let r = centerR - boosterData.radius; r <= centerR + boosterData.radius; r++) {
            for (let c = centerC - boosterData.radius; c <= centerC + boosterData.radius; c++) {
                if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && grid[r][c]) {
                    toDestroy.push({ r, c });
                }
            }
        }
    } else if (type === 'burst') {
        let colorToClear = targetLumen.type;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (grid[r][c] && (grid[r][c].type === colorToClear || grid[r][c].type === 99)) {
                    toDestroy.push({ r, c });
                }
            }
        }
    }

    if (typeof playPopSound === 'function') {
        try { playPopSound(scene); } catch(e){}
    }

    toDestroy.forEach(pos => {
        if (typeof playPopAnimation === 'function') playPopAnimation(scene, pos.r, pos.c, grid[pos.r][pos.c].type);
        grid[pos.r][pos.c] = null; 
    });

    scene.time.delayedCall(300, () => applyGravity(scene));
}

function checkWinLossConditions(scene) {
    if (score >= TARGET_SCORE) {
        isGameOver = true;
        let stars = 1;
        if (movesRemaining >= 15) stars = 3;
        else if (movesRemaining >= 5) stars = 2;
        
        if (typeof savePlayerProgress === 'function') savePlayerProgress(currentLevel, score, stars);
        scene.time.delayedCall(500, () => {
            if (typeof showEndGamePopup === 'function') showEndGamePopup(scene, true, stars);
        });
    } else if (movesRemaining <= 0) {
        isGameOver = true;
        scene.time.delayedCall(500, () => {
            if (typeof showEndGamePopup === 'function') showEndGamePopup(scene, false, 0);
        });
    }
}
