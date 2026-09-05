
// --- graphics.js ---

let lineGraphics;
let lumenSprites = []; // 2D array to hold Phaser Sprite objects
let particleManager;

function initGraphics(scene) {
    createBoardBackground(scene);
    createBoosterButtons(scene);
    
    // Graphics object for drawing the linking lines
    lineGraphics = scene.add.graphics().setDepth(5);
    
    // Initialize empty sprite grid
    lumenSprites = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    
    // Setup generic particle manager for popping effects
    particleManager = scene.add.particles('loading_logo').setDepth(20); // Fallback texture, colored later
    
    drawLumens(scene);
}

// 1. Board Background (Dark translucent rounded rect to frame the Lumens)
function createBoardBackground(scene) {
    const bgWidth = GRID_COLS * TILE_SIZE;
    const bgHeight = GRID_ROWS * TILE_SIZE;
    
    let boardBg = scene.add.graphics().setDepth(1);
    boardBg.fillStyle(0x10052b, 0.6); // Dark cosmic purple, semi-transparent
    boardBg.fillRoundedRect(BOARD_OFFSET_X - 5, BOARD_OFFSET_Y - 5, bgWidth + 10, bgHeight + 10, 16);
    
    boardBg.lineStyle(4, 0xfbcfe8, 0.4);
    boardBg.strokeRoundedRect(BOARD_OFFSET_X - 5, BOARD_OFFSET_Y - 5, bgWidth + 10, bgHeight + 10, 16);
}

// 2. Booster Buttons (Overlays the bottom dock loaded in main.js)
function createBoosterButtons(scene) {
    const dockY = GAME_HEIGHT - 60;
    const spacing = Math.min(120, GAME_WIDTH / 3.5);
    const startX = GAME_WIDTH / 2 - spacing;

    const boosters = [
        { id: 'shuffle', key: 'icon_shuffle', cost: BOOSTERS.shuffle.cost, x: startX },
        { id: 'bomb', key: 'icon_bomb', cost: BOOSTERS.bomb.cost, x: GAME_WIDTH / 2 },
        { id: 'burst', key: 'icon_burst', cost: BOOSTERS.burst.cost, x: startX + spacing }
    ];

    boosters.forEach(b => {
        let btn = scene.add.image(b.x, dockY - 5, b.key)
            .setDisplaySize(50, 50)
            .setInteractive({ useHandCursor: true })
            .setDepth(15);
            
        let costText = scene.add.text(b.x, dockY + 25, `-${b.cost}`, {
            fontSize: '16px', fontStyle: 'bold', color: '#fca5a5'
        }).setOrigin(0.5).setDepth(15);

        // Visual click feedback
        btn.on('pointerdown', () => { btn.setScale(0.85); });
        btn.on('pointerup', () => { 
            btn.setScale(1); 
            activateBooster(scene, b.id); // Triggers logic in logic.js
        });
        btn.on('pointerout', () => { btn.setScale(1); });
    });
}

// 3. Render the initial Lumens on the board
function drawLumens(scene) {
    const spriteSize = TILE_SIZE * 0.85; // Leave a tiny gap between grid cells

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let lumenData = grid[r][c];
            if (lumenData === null) continue;

            let x = BOARD_OFFSET_X + (c * TILE_SIZE) + (TILE_SIZE / 2);
            let y = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
            
            // Determine texture (Fusion Orb vs Standard Lumen)
            let textureKey = lumenData.type === 99 ? 'fusion_orb' : LUMEN_TYPES[lumenData.type].textureClosed;

            let sprite = scene.add.image(x, y - GAME_HEIGHT, textureKey)
                .setDisplaySize(spriteSize, spriteSize)
                .setDepth(2)
                .setInteractive({ useHandCursor: true });

            // Attach grid coordinates to the sprite
            sprite.gridRow = r;
            sprite.gridCol = c;

            // Setup Input Listeners (Logic handled in logic.js)
            sprite.on('pointerdown', (pointer) => handlePointerDown(scene, r, c));
            sprite.on('pointerover', (pointer) => handlePointerOver(scene, r, c));
            
            lumenSprites[r][c] = sprite;

            // Smooth Drop-in Animation for starting the level
            scene.tweens.add({
                targets: sprite,
                y: y,
                duration: 600 + (r * 100),
                ease: 'Bounce.easeOut'
            });
        }
    }
}

// 4. Update Lumen Textures (Swaps between _closed and _opened)
function updateLumenVisuals(scene) {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let sprite = lumenSprites[r][c];
            let data = grid[r][c];
            
            if (!sprite || !data) continue;

            // Stop any existing pulse tweens to reset
            scene.tweens.killTweensOf(sprite);
            sprite.setScale((TILE_SIZE * 0.85) / sprite.width); // Reset scale

            if (data.type === 99) {
                sprite.setTexture('fusion_orb');
                continue; // Fusion orb doesn't have an opened/closed state
            }

            // Check if this specific Lumen is currently being linked
            let isLinked = linkedLumens.some(link => link.r === r && link.c === c);
            
            if (isLinked) {
                sprite.setTexture(LUMEN_TYPES[data.type].textureOpen);
                // Vibrant pulse animation while selected
                scene.tweens.add({
                    targets: sprite,
                    scaleX: sprite.scaleX * 1.15,
                    scaleY: sprite.scaleY * 1.15,
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });
            } else {
                sprite.setTexture(LUMEN_TYPES[data.type].textureClosed);
            }
        }
    }
}

// 5. Draw Dynamic Glowing Connection Lines
function drawConnectionLines(scene, pointer = null) {
    lineGraphics.clear();
    
    if (linkedLumens.length === 0) return;

    lineGraphics.lineStyle(10, 0xfbcfe8, 0.8);
    lineGraphics.beginPath();

    // Draw lines between all connected Lumens
    for (let i = 0; i < linkedLumens.length; i++) {
        let r = linkedLumens[i].r;
        let c = linkedLumens[i].c;
        let x = BOARD_OFFSET_X + (c * TILE_SIZE) + (TILE_SIZE / 2);
        let y = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);

        if (i === 0) {
            lineGraphics.moveTo(x, y);
        } else {
            lineGraphics.lineTo(x, y);
        }
    }

    // Draw line from the last Lumen to the player's moving finger/mouse
    if (pointer && pointer.isDown) {
        lineGraphics.lineTo(pointer.x, pointer.y);
    }

    lineGraphics.strokePath();
}

// 6. Vibrant Pop Animation & Removal
function playPopAnimation(scene, r, c, type) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;

    let x = sprite.x;
    let y = sprite.y;

    // Get color based on type for the particle explosion
    let colors = [0x38bdf8, 0x34d399, 0xfde047, 0xc084fc, 0xf43f5e, 0xfb923c, 0xfb7185];
    let tintColor = type === 99 ? 0xffffff : colors[type % colors.length];

    // Particle Burst
    let emitter = particleManager.createEmitter({
        x: x, y: y,
        speed: { min: 100, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.1, end: 0 },
        tint: tintColor,
        lifespan: 600,
        blendMode: 'ADD',
        quantity: 12
    });

    scene.time.delayedCall(600, () => { emitter.remove(); });

    // Pop and destroy sprite
    scene.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
            sprite.destroy();
            lumenSprites[r][c] = null;
        }
    });
}

// 7. Refill animation (Drop new Lumens from the top)
function animateLumenDrop(scene, r, c, newY, delay) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;

    scene.tweens.add({
        targets: sprite,
        y: newY,
        duration: 400,
        ease: 'Bounce.easeOut',
        delay: delay
    });
}

// 8. End Game Popup (Win / Loss Screen)
function showEndGamePopup(scene, isWin, starsEarned) {
    let popupContainer = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200);

    // Full screen dark overlay
    let overlay = scene.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.75).setInteractive();

    // Use your specific PNG asset
    let bg = scene.add.image(0, 0, 'popup_game_over').setDisplaySize(360, 400);

    let titleText = scene.add.text(0, -120, isWin ? 'LEVEL CLEARED!' : 'OUT OF MOVES', {
        fontSize: '34px', fontStyle: 'bold', color: isWin ? '#FCD34D' : '#fca5a5',
        stroke: '#4a044e', strokeThickness: 4
    }).setOrigin(0.5);

    let scoreDisplay = scene.add.text(0, -30, `Score: ${score}`, {
        fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);

    // Draw Stars
    let stars = [];
    for (let i = 0; i < 3; i++) {
        let starColor = i < starsEarned ? '#FCD34D' : '#9ca3af';
        let star = scene.add.text(-60 + (i * 60), 30, '★', { 
            fontSize: '54px', color: starColor, stroke: '#111827', strokeThickness: 3 
        }).setOrigin(0.5);
        stars.push(star);
    }

    // Interactive Play / Continue Zone over the PNG's built in button
    let btnZone = scene.add.zone(0, 150, 220, 70).setInteractive({ useHandCursor: true });
    let btnText = scene.add.text(0, 150, isWin ? 'CONTINUE' : 'TRY AGAIN', {
        fontSize: '28px', fontStyle: 'bold', color: '#ffffff', stroke: '#059669', strokeThickness: 4
    }).setOrigin(0.5);

    btnZone.on('pointerdown', () => btnText.setScale(0.9));
    btnZone.on('pointerup', () => {
        btnText.setScale(1);
        scene.scene.start('LevelSelectScene'); // Returns to map
    });

    popupContainer.add([overlay, bg, titleText, scoreDisplay, ...stars, btnZone, btnText]);
    
    // Smooth pop-in
    popupContainer.setScale(0);
    scene.tweens.add({
        targets: popupContainer,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut'
    });
}
