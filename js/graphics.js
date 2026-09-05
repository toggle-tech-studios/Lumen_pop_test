// --- graphics.js ---

let lineGraphics;
let lumenSprites = []; 

function initGraphics(scene) {
    createBoardBackground(scene);
    createBoosterButtons(scene);
    
    lineGraphics = scene.add.graphics().setDepth(5);
    lumenSprites = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    
    drawLumens(scene);
}

function createBoardBackground(scene) {
    const bgWidth = GRID_COLS * TILE_SIZE;
    const bgHeight = GRID_ROWS * TILE_SIZE;
    
    let boardBg = scene.add.graphics().setDepth(1);
    boardBg.fillStyle(0x1a0b36, 0.88);
    boardBg.fillRoundedRect(BOARD_OFFSET_X - 8, BOARD_OFFSET_Y - 8, bgWidth + 16, bgHeight + 16, 16);
    
    boardBg.lineStyle(3, 0xfbcfe8, 0.5);
    boardBg.strokeRoundedRect(BOARD_OFFSET_X - 8, BOARD_OFFSET_Y - 8, bgWidth + 16, bgHeight + 16, 16);
}

function createBoosterButtons(scene) {
    const dockY = GAME_HEIGHT - 50;
    
    // Fixed slots matching the 3 compartments on the ui_booster_dock graphic
    const slotOffset = Math.min(105, GAME_WIDTH * 0.26);
    const boosters = [
        { id: 'shuffle', key: 'icon_shuffle', cost: BOOSTERS.shuffle.cost, x: (GAME_WIDTH / 2) - slotOffset },
        { id: 'bomb',    key: 'icon_bomb',    cost: BOOSTERS.bomb.cost,    x: GAME_WIDTH / 2 },
        { id: 'burst',   key: 'icon_burst',   cost: BOOSTERS.burst.cost,   x: (GAME_WIDTH / 2) + slotOffset }
    ];

    boosters.forEach(b => {
        let btn = scene.add.image(b.x, dockY - 6, b.key)
            .setDisplaySize(42, 42)
            .setInteractive({ useHandCursor: true })
            .setDepth(15);
            
        let baseScaleX = btn.scaleX;
        let baseScaleY = btn.scaleY;
            
        scene.add.text(b.x, dockY + 24, `-${b.cost}`, {
            fontSize: '13px', fontStyle: 'bold', color: '#fca5a5'
        }).setOrigin(0.5).setDepth(15);

        btn.on('pointerdown', () => { 
            btn.setScale(baseScaleX * 0.85, baseScaleY * 0.85); 
        });
        
        btn.on('pointerup', () => { 
            btn.setScale(baseScaleX, baseScaleY);
            activateBooster(scene, b.id);
        });
        
        btn.on('pointerout', () => { 
            btn.setScale(baseScaleX, baseScaleY); 
        });
    });
}

function drawLumens(scene) {
    // Clamped cell size ensures zero overlap between adjacent rows and columns
    const spriteSize = Math.floor(TILE_SIZE * 0.72);

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let lumenData = grid[r][c];
            if (lumenData === null) continue;

            let x = BOARD_OFFSET_X + (c * TILE_SIZE) + (TILE_SIZE / 2);
            let y = BOARD_OFFSET_Y + (r * TILE_SIZE) + (TILE_SIZE / 2);
            
            let textureKey = lumenData.type === 99 ? 'fusion_orb' : LUMEN_TYPES[lumenData.type].textureClosed;
            
            let sprite = scene.add.image(x, y - GAME_HEIGHT, textureKey)
                .setDisplaySize(spriteSize, spriteSize)
                .setDepth(2)
                .setInteractive({ useHandCursor: true });

            sprite.gridRow = r; 
            sprite.gridCol = c;
            sprite.on('pointerdown', () => handlePointerDown(scene, sprite.gridRow, sprite.gridCol));
            sprite.on('pointerover', () => handlePointerOver(scene, sprite.gridRow, sprite.gridCol));
            
            lumenSprites[r][c] = sprite;

            scene.tweens.add({ targets: sprite, y: y, duration: 500 + (r * 70), ease: 'Bounce.easeOut' });
        }
    }
}

function updateLumenVisuals(scene) {
    const spriteSize = Math.floor(TILE_SIZE * 0.72);

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let sprite = lumenSprites[r][c];
            let data = grid[r][c];
            if (!sprite || !data) continue;

            scene.tweens.killTweensOf(sprite);

            if (data.type === 99) { 
                sprite.setTexture('fusion_orb');
                sprite.setDisplaySize(spriteSize, spriteSize);
                continue; 
            }

            let isLinked = linkedLumens.some(link => link.r === r && link.c === c);
            
            if (isLinked) {
                sprite.setTexture(LUMEN_TYPES[data.type].textureOpen);
                sprite.setDisplaySize(spriteSize, spriteSize);
                
                scene.tweens.add({ 
                    targets: sprite, 
                    scaleX: sprite.scaleX * 1.12, 
                    scaleY: sprite.scaleY * 1.12, 
                    duration: 250, yoyo: true, repeat: -1 
                });
            } else {
                sprite.setTexture(LUMEN_TYPES[data.type].textureClosed);
                sprite.setDisplaySize(spriteSize, spriteSize);
            }
        }
    }
}

function drawConnectionLines(scene, pointer = null) {
    lineGraphics.clear();
    if (linkedLumens.length === 0) return;
    
    lineGraphics.lineStyle(6, 0xfbcfe8, 0.9);
    lineGraphics.beginPath();

    for (let i = 0; i < linkedLumens.length; i++) {
        let x = BOARD_OFFSET_X + (linkedLumens[i].c * TILE_SIZE) + (TILE_SIZE / 2);
        let y = BOARD_OFFSET_Y + (linkedLumens[i].r * TILE_SIZE) + (TILE_SIZE / 2);
        
        if (i === 0) lineGraphics.moveTo(x, y); 
        else lineGraphics.lineTo(x, y);
    }
    
    if (pointer && pointer.isDown) lineGraphics.lineTo(pointer.x, pointer.y);
    lineGraphics.strokePath();
}

function playPopAnimation(scene, r, c, type) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;
    
    scene.tweens.add({ 
        targets: sprite, 
        scale: 0, 
        alpha: 0, 
        duration: 160, 
        ease: 'Sine.easeIn',
        onComplete: () => { 
            sprite.destroy(); 
            lumenSprites[r][c] = null; 
        } 
    });
}

function animateLumenDrop(scene, r, c, newY, delay) {
    let sprite = lumenSprites[r][c];
    if (!sprite) return;
    
    const spriteSize = Math.floor(TILE_SIZE * 0.72);
    sprite.setDisplaySize(spriteSize, spriteSize);

    scene.tweens.add({ 
        targets: sprite, y: newY, duration: 380, ease: 'Bounce.easeOut', delay: delay 
    });
}

function showEndGamePopup(scene, isWin, starsEarned) {
    let popupContainer = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(200);
    
    let overlay = scene.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.75).setInteractive();
    let bg = scene.add.image(0, 0, 'popup_game_over').setDisplaySize(310, 350);

    let titleText = scene.add.text(0, -105, isWin ? 'CLEARED!' : 'OUT OF MOVES', {
        fontSize: '28px', fontStyle: 'bold', color: isWin ? '#FCD34D' : '#fca5a5', stroke: '#4a044e', strokeThickness: 4
    }).setOrigin(0.5);

    let scoreDisplay = scene.add.text(0, -25, `Score: ${score}`, { 
        fontSize: '24px', fontStyle: 'bold', color: '#FFFFFF' 
    }).setOrigin(0.5);

    let stars = [];
    for (let i = 0; i < 3; i++) {
        let star = scene.add.text(-44 + (i * 44), 30, '★', { 
            fontSize: '44px', color: i < starsEarned ? '#FCD34D' : '#9ca3af', stroke: '#111827', strokeThickness: 3 
        }).setOrigin(0.5);
        stars.push(star);
    }

    let btnZone = scene.add.zone(0, 120, 190, 55).setInteractive({ useHandCursor: true });
    let btnText = scene.add.text(0, 120, isWin ? 'CONTINUE' : 'TRY AGAIN', {
        fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#059669', strokeThickness: 4
    }).setOrigin(0.5);

    btnZone.on('pointerdown', () => btnText.setScale(0.9));
    btnZone.on('pointerup', () => { 
        btnText.setScale(1); 
        scene.scene.start('LevelSelectScene'); 
    });

    popupContainer.add([overlay, bg, titleText, scoreDisplay, ...stars, btnZone, btnText]);
    popupContainer.setScale(0);
    scene.tweens.add({ targets: popupContainer, scale: 1, duration: 350, ease: 'Back.easeOut' });
}
