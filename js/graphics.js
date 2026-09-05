// --- graphics.js ---

let lineGraphics;
let lumenSprites = []; 
let particleManager;

function initGraphics(scene) {
    createBoardBackground(scene);
    createBoosterButtons(scene);
    lineGraphics = scene.add.graphics().setDepth(5);
    lumenSprites = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    particleManager = scene.add.particles('loading_logo').setDepth(20); 
    drawLumens(scene);
}

// FIX: Board outline squishing on phones
function createBoardBackground(scene) {
    const bgWidth = GRID_COLS * TILE_SIZE;
    const bgHeight = GRID_ROWS * TILE_SIZE;
    
    let boardBg = scene.add.graphics().setDepth(1);
    boardBg.fillStyle(0x1a0b36, 0.85); // Dark sleek purple
    boardBg.fillRoundedRect(BOARD_OFFSET_X - 6, BOARD_OFFSET_Y - 6, bgWidth + 12, bgHeight + 12, 16);
    
    boardBg.lineStyle(3, 0xfbcfe8, 0.5);
    boardBg.strokeRoundedRect(BOARD_OFFSET_X - 6, BOARD_OFFSET_Y - 6, bgWidth + 12, bgHeight + 12, 16);
}

// FIX: Giant Burst Button bug fixed! Uses exact baseScale memory.
function createBoosterButtons(scene) {
    const dockY = GAME_HEIGHT - 50;
    const spacing = Math.min(100, GAME_WIDTH / 3.5);
    const startX = GAME_WIDTH / 2 - spacing;

    const boosters = [
        { id: 'shuffle', key: 'icon_shuffle', cost: BOOSTERS.shuffle.cost, x: startX },
        { id: 'bomb', key: 'icon_bomb', cost: BOOSTERS.bomb.cost, x: GAME_WIDTH / 2 },
        { id: 'burst', key: 'icon_burst', cost: BOOSTERS.burst.cost, x: startX + spacing }
    ];

    boosters.forEach(b => {
        let btn = scene.add.image(b.x, dockY - 5, b.key).setDisplaySize(45, 45).setInteractive({ useHandCursor: true }).setDepth(15);
        let baseScale = btn.scale; // Memorizes the required scale to stay 45x45
            
        let costText = scene.add.text(b.x, dockY + 25, `-${b.cost}`, {
            fontSize: '14px', fontStyle: 'bold', color: '#fca5a5'
        }).setOrigin(0.5).setDepth(15);

        btn.on('pointerdown', () => { btn.setScale(baseScale * 0.8); });
        btn.on('pointerup', () => { 
            btn.setScale(baseScale); // Returns safely to 45x45!
            activateBooster(scene, b.id);
        });
        btn.on('pointerout', () => { btn.setScale(baseScale); });
    });
}

function drawLumens(scene) {
    const spriteSize = TILE_SIZE * 0.82; 

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let lumenData = grid[r][c];
            if (lumenData === null) continue;

            let x = BOARD_OFFSET_X + (c * TILE_SIZE) + (TILE_SIZE / 2);
            let y = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
            
            let textureKey = lumenData.type === 99 ? 'fusion_orb' : LUMEN_TYPES[lumenData.type].textureClosed;
            let sprite = scene.add.image(x, y - GAME_HEIGHT, textureKey).setDisplaySize(spriteSize, spriteSize).setDepth(2).setInteractive();

            sprite.gridRow = r; sprite.gridCol = c;
            sprite.on('pointerdown', (pointer) => handlePointerDown(scene, r, c));
            sprite.on('pointerover', (pointer) => handlePointerOver(scene, r, c));
            lumenSprites[r][c] = sprite;

            scene.tweens.add({ targets: sprite, y: y, duration: 600 + (r * 100), ease: 'Bounce.easeOut' });
        }
    }
}

function updateLumenVisuals(scene) {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let sprite = lumenSprites[r][c];
            let data = grid[r][c];
            if (!sprite || !data) continue;

            scene.tweens.killTweensOf(sprite);
            sprite.setScale((TILE_SIZE * 0.82) / sprite.width); 

            if (data.type === 99) { sprite.setTexture('fusion_orb'); continue; }

            let isLinked = linkedLumens.some(link => link.r === r && link.c === c);
            if (isLinked) {
                sprite.setTexture(LUMEN_TYPES[data.type].textureOpen);
                scene.tweens.add({ targets: sprite, scaleX: sprite.scaleX * 1.15, scaleY: sprite.scaleY * 1.15, duration: 300, yoyo: true, repeat: -1 });
            } else {
                sprite.setTexture(LUMEN_TYPES[data.type].textureClosed);
            }
        }
    }
}

function drawConnectionLines(scene, pointer = null) {
    lineGraphics.clear();
    if (linkedLumens.length === 0) return;
    lineGraphics.lineStyle(8, 0xfbcfe8, 0.9);
    lineGraphics.beginPath();

    for (let i = 0; i < linkedLumens.length; i++) {
        let x = BOARD_OFFSET_X + (linkedLumens[i].c * TILE_SIZE) + (TILE_SIZE / 2);
        let y = BOARD_OFFSET_Y + (linkedLumens[i].r * TILE_SIZE) + (TILE_SIZE / 2);
        if (i === 0) lineGraphics.moveTo(x, y); else lineGraphics.lineTo(x, y);
    }
    if (pointer && pointer.isDown) lineGraphics.lineTo(pointer.x, pointer.y);
    lineGraphics.strokePath();
}

function playPopAnimation(scene, r, c, type) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;
    let colors = [0x38bdf8, 0x34d399, 0xfde047, 0xc084fc, 0xf43f5e, 0xfb923c, 0xfb7185];
    let tintColor = type === 99 ? 0xffffff : colors[type % colors.length];

    let emitter = particleManager.createEmitter({
        x: sprite.x, y: sprite.y, speed: { min: 80, max: 200 }, scale: { start: 0.1, end: 0 },
        tint: tintColor, lifespan: 500, blendMode: 'ADD', quantity: 10
    });
    scene.time.delayedCall(500, () => { emitter.remove(); });
    scene.tweens.add({ targets: sprite, scale: 0, alpha: 0, duration: 150, onComplete: () => { sprite.destroy(); lumenSprites[r][c] = null; } });
}

function animateLumenDrop(scene, r, c, newY, delay) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;
    scene.tweens.add({ targets: sprite, y: newY, duration: 400, ease: 'Bounce.easeOut', delay: delay });
}

function showEndGamePopup(scene, isWin, starsEarned) {
    let popupContainer = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200);
    let overlay = scene.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.75).setInteractive();
    let bg = scene.add.image(0, 0, 'popup_game_over').setDisplaySize(320, 360);

    let titleText = scene.add.text(0, -110, isWin ? 'CLEARED!' : 'OUT OF MOVES', {
        fontSize: '30px', fontStyle: 'bold', color: isWin ? '#FCD34D' : '#fca5a5', stroke: '#4a044e', strokeThickness: 4
    }).setOrigin(0.5);

    let scoreDisplay = scene.add.text(0, -30, `Score: ${score}`, { fontSize: '26px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5);

    let stars = [];
    for (let i = 0; i < 3; i++) {
        let star = scene.add.text(-50 + (i * 50), 30, '★', { fontSize: '48px', color: i < starsEarned ? '#FCD34D' : '#9ca3af', stroke: '#111827', strokeThickness: 3 }).setOrigin(0.5);
        stars.push(star);
    }

    let btnZone = scene.add.zone(0, 130, 200, 60).setInteractive({ useHandCursor: true });
    let btnText = scene.add.text(0, 130, isWin ? 'CONTINUE' : 'TRY AGAIN', {
        fontSize: '24px', fontStyle: 'bold', color: '#ffffff', stroke: '#059669', strokeThickness: 4
    }).setOrigin(0.5);

    btnZone.on('pointerdown', () => btnText.setScale(0.9));
    btnZone.on('pointerup', () => { btnText.setScale(1); scene.scene.start('LevelSelectScene'); });

    popupContainer.add([overlay, bg, titleText, scoreDisplay, ...stars, btnZone, btnText]);
    popupContainer.setScale(0);
    scene.tweens.add({ targets: popupContainer, scale: 1, duration: 400, ease: 'Back.easeOut' });
}
