// --- logic.js ---

let grid = [];
let isDragging = false;
let linkedLumens = [];
let currentLinkColor = -1;
let gameSceneRef = null;
let isGameOver = false;
let activeBooster = null; // Tracks if the player is currently aiming a Bomb or Burst

function initGameLogic(scene) {
    gameSceneRef = scene;
    isGameOver = false;
    isDragging = false;
    linkedLumens = [];
    activeBooster = null;
    score = 0;
    
    generateGrid();

    // Global pointer up listener to end drawing/linking
    scene.input.on('pointerup', () => {
        if (!isGameOver && isDragging) {
            handlePointerUp(scene);
        }
    });

    // Global pointer move listener to update the floating connection line
    scene.input.on('pointermove', (pointer) => {
        if (!isGameOver && isDragging) {
            drawConnectionLines(scene, pointer);
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
    // 2% chance for a Fusion Orb (Type 99), otherwise pick a random active color
    if (Math.random() < 0.02) {
        return { type: 99 };
    }
    let randomType = Math.floor(Math.random() * ACTIVE_COLORS);
    return { type: randomType };
}

function handlePointerDown(scene, r, c) {
    if (isGameOver) return;

    // 1. Check if we are aiming a targeted booster
    if (activeBooster === 'bomb' || activeBooster === 'burst') {
        handleBoosterTarget(scene, r, c);
        return;
    }

    // 2. Otherwise, start a normal drag/link
    let lumen = grid[r][c];
    if (lumen) {
        isDragging = true;
        currentLinkColor = lumen.type;
        linkedLumens = [{ r, c }];
        
        updateLumenVisuals(scene); // Swaps texture to _opened
        drawConnectionLines(scene, scene.input.activePointer);
    }
}

function handlePointerOver(scene, r, c) {
    if (isGameOver || !isDragging || activeBooster) return;

    let lumen = grid[r][c];
    if (!lumen) return;

    // Check if it's already in the link
    let existingIndex = linkedLumens.findIndex(l => l.r === r && l.c === c);
    
    if (existingIndex !== -1) {
        // If we backtrack, remove the end of the chain
        if (existingIndex === linkedLumens.length - 2) {
            linkedLumens.pop();
            // Re-evaluate the link color in case we backtracked over a Fusion Orb
            currentLinkColor = grid[linkedLumens[0].r][linkedLumens[0].c].type; 
            for (let i = 1; i < linkedLumens.length; i++) {
                let t = grid[linkedLumens[i].r][linkedLumens[i].c].type;
                if (t !== 99 && currentLinkColor === 99) currentLinkColor = t;
            }
            updateLumenVisuals(scene);
            drawConnectionLines(scene, scene.input.activePointer);
        }
        return;
    }

    // Check adjacency (horizontal, vertical, diagonal)
    let last = linkedLumens[linkedLumens.length - 1];
    let isAdjacent = Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1;

    // Can link if adjacent AND (color matches OR one of them is a Fusion Orb)
    if (isAdjacent && (lumen.type === currentLinkColor || lumen.type === 99 || currentLinkColor === 99)) {
        linkedLumens.push({ r, c });
        if (currentLinkColor === 99 && lumen.type !== 99) {
            currentLinkColor = lumen.type; // Adopt color if we started on a Fusion Orb
        }
        updateLumenVisuals(scene);
        try { playLinkSound(scene); } catch (e) {}
    }
}

function handlePointerUp(scene) {
    isDragging = false;
    
    if (linkedLumens.length >= 3) {
        processMatches(scene);
        movesRemaining--;
        scene.movesText.setText(`MOVES\n${movesRemaining}`);
    } else {
        // Failed link, reset visuals
        linkedLumens = [];
        updateLumenVisuals(scene);
        drawConnectionLines(scene);
    }
}

function processMatches(scene) {
    let points = linkedLumens.length * 10;
    // Bonus points for longer chains
    if (linkedLumens.length >= 5) points += 50; 
    if (linkedLumens.length >= 8) points += 100;

    updateScore(points);
    try { playPopSound(scene); } catch (e) {}

    linkedLumens.forEach(pos => {
        playPopAnimation(scene, pos.r, pos.c, grid[pos.r][pos.c].type);
        grid[pos.r][pos.c] = null; // Clear from logic
    });

    linkedLumens = [];
    drawConnectionLines(scene);
    
    scene.time.delayedCall(250, () => applyGravity(scene));
}

function applyGravity(scene) {
    let dropped = false;

    // 1. Move Lumens down into empty spaces
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
                        
                        sprite.gridRow = r;
                        let newY = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
                        animateLumenDrop(scene, r, c, newY, 0);
                        dropped = true;
                        break;
                    }
                }
            }
        }
    }

    // 2. Fill empty top spaces with new random Lumens
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
            let startY = targetY - GAME_HEIGHT; // Drop from off-screen top
            
            let textureKey = grid[r][c].type === 99 ? 'fusion_orb' : LUMEN_TYPES[grid[r][c].type].textureClosed;
            
            let sprite = scene.add.image(x, startY, textureKey)
                .setDisplaySize(TILE_SIZE * 0.85, TILE_SIZE * 0.85)
                .setDepth(2)
                .setInteractive({ useHandCursor: true });
                
            sprite.gridRow = r;
            sprite.gridCol = c;
            sprite.on('pointerdown', () => handlePointerDown(scene, sprite.gridRow, sprite.gridCol));
            sprite.on('pointerover', () => handlePointerOver(scene, sprite.gridRow, sprite.gridCol));
            
            lumenSprites[r][c] = sprite;
            
            let delay = r * 50;
            if (delay > maxDelay) maxDelay = delay;
            animateLumenDrop(scene, r, c, targetY, delay);
            dropped = true;
        }
    }

    scene.time.delayedCall(maxDelay + 450, () => {
        updateLumenVisuals(scene);
        checkWinLossConditions(scene);
    });
}

function updateScore(amount) {
    // Allows negative amounts (for boosters), but prevents score from going below 0
    score = Math.max(0, score + amount);
    gameSceneRef.scoreText.setText(`SCORE: ${score}`);
}

function activateBooster(scene, type) {
    if (isGameOver) return;
    
    let boosterData = BOOSTERS[type];
    
    // Shuffle acts immediately
    if (type === 'shuffle') {
        updateScore(-boosterData.scorePenalty);
        activeBooster = null;
        
        // Destroy all existing sprites instantly
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (lumenSprites[r][c]) lumenSprites[r][c].destroy();
            }
        }
        generateGrid();
        drawLumens(scene);
        try { playPopSound(scene); } catch(e){}
    } else {
        // Bomb and Burst require targeting
        activeBooster = type;
        scene.cameras.main.flash(200, 251, 207, 232); // Slight pink flash to indicate aiming mode
    }
}

function handleBoosterTarget(scene, centerR, centerC) {
    let type = activeBooster;
    activeBooster = null; // Reset aiming mode
    let toDestroy = [];
    let targetLumen = grid[centerR][centerC];
    
    if (!targetLumen) return;

    let boosterData = BOOSTERS[type];
    updateScore(-boosterData.scorePenalty);

    if (type === 'bomb') {
        // 3x3 Explosion (Radius 1)
        for (let r = centerR - boosterData.radius; r <= centerR + boosterData.radius; r++) {
            for (let c = centerC - boosterData.radius; c <= centerC + boosterData.radius; c++) {
                if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && grid[r][c]) {
                    toDestroy.push({ r, c });
                }
            }
        }
    } else if (type === 'burst') {
        // Target 1 color globally
        let colorToClear = targetLumen.type;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (grid[r][c] && (grid[r][c].type === colorToClear || grid[r][c].type === 99)) {
                    toDestroy.push({ r, c });
                }
            }
        }
    }

    try { playPopSound(scene); } catch(e){}

    toDestroy.forEach(pos => {
        playPopAnimation(scene, pos.r, pos.c, grid[pos.r][pos.c].type);
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
        
        savePlayerProgress(currentLevel, score, stars);
        scene.time.delayedCall(500, () => showEndGamePopup(scene, true, stars));
    } else if (movesRemaining <= 0) {
        isGameOver = true;
        scene.time.delayedCall(500, () => showEndGamePopup(scene, false, 0));
    }
}
