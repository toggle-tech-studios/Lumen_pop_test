
// --- PROCEDURAL GRAPHICS & UI DRAWING ---

function generateKidFriendlyBackground(scene) {
  const canvas = document.createElement('canvas'); 
  canvas.width = GAME_WIDTH; 
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext('2d'); 
  const w = canvas.width, h = canvas.height;
  
  // 1. Deep Space Background Gradient (Dynamically scaled)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#10052b'); // Very dark purple
  sky.addColorStop(0.5, '#0b1035'); // Dark navy
  sky.addColorStop(1, '#1a0b2e'); // Deep purple
  ctx.fillStyle = sky; 
  ctx.fillRect(0, 0, w, h);

  // 2. Twinkling Stardust
  for(let i = 0; i < 150; i++) {
    let rand = Math.random();
    if(rand < 0.33) ctx.fillStyle = '#ffffff';
    else if(rand < 0.66) ctx.fillStyle = '#fbcfe8';
    else ctx.fillStyle = '#bae6fd';

    ctx.globalAlpha = Math.random() * 0.8 + 0.2;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // 3. Magical Comet Swooshes (Anchored for height)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-50, 200);
  ctx.bezierCurveTo(200, 150, 400, 250, 700, 100);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; // Cyan
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(700, h - 200);
  ctx.bezierCurveTo(450, h - 250, 200, h - 100, -50, h - 150);
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.15)'; // Purple
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  // 4. Glowing 4-Point Stars
  function drawGlowingStar(x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.2, size, 0);
    ctx.quadraticCurveTo(size * 0.2, size * 0.2, 0, size);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.2, -size, 0);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.2, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  drawGlowingStar(120, 150, 25, '#fde047'); 
  drawGlowingStar(550, 280, 20, '#38bdf8'); 
  drawGlowingStar(80, h - 350, 15, '#f472b6');  
  drawGlowingStar(500, h - 150, 30, '#c084fc'); 
  drawGlowingStar(330, 60, 12, '#ffffff');  
  
  scene.textures.addCanvas('bg', canvas);
}

function generateParticleTexture(scene) {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.8)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
  scene.textures.addCanvas('particle', canvas);
}

function generateAllCanvasTextures(scene) {
  // Generate all standard Lumens
  LUMEN_CONFIGS.forEach(cfg => { 
      createCanvasTexture(scene, cfg, false); 
      createCanvasTexture(scene, cfg, true); 
  });
  
  // Generate the new rare Fusion Orb
  createFusionOrbTexture(scene);
}

// --- FUSION ORB TEXTURE GENERATOR ---
function createFusionOrbTexture(scene) {
  const canvas = document.createElement('canvas'); 
  canvas.width = 90; // Slightly larger than normal Lumens (78px)
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  const cx = 45, cy = 45, r = 32;

  // Outer Aura Glow
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 15;

  // Dark Glossy Cocoa/Purple Body
  const grad = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, r);
  grad.addColorStop(0, '#581c87'); // Lighter purple top-left
  grad.addColorStop(0.6, '#2e1065'); // Deep cocoa/purple mid
  grad.addColorStop(1, '#090514');   // Almost black bottom-right
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Internal Energy Swirls
  ctx.shadowBlur = 0; 
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip(); // Keep swirls inside the orb

  const drawSwirl = (color, width, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.stroke();
  };

  // Draw colorful magical energy
  drawSwirl('rgba(56, 189, 248, 0.8)', 6, cx-30, cy-10, cx-10, cy-30, cx+10, cy+30, cx+30, cy+10); // Cyan
  drawSwirl('rgba(244, 114, 182, 0.8)', 5, cx-20, cy+20, cx-10, cy-10, cx+20, cy-20, cx+20, cy+20); // Pink
  drawSwirl('rgba(251, 191, 36, 0.8)',  4, cx-10, cy-20, cx+20, cy, cx-20, cy+10, cx+10, cy+20);    // Gold

  // Cute, Mysterious Glowing Eyes (to fit Lumen family)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx - 12, cy + 2, 3.5, 0, Math.PI*2);
  ctx.arc(cx + 12, cy + 2, 3.5, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Top Glossy Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 18, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Floating Particles Orbiting the Orb
  const colors = ['#38bdf8', '#f472b6', '#fbbf24', '#c084fc'];
  for(let i = 0; i < 6; i++) {
    let angle = (Math.PI * 2 / 6) * i;
    let px = cx + Math.cos(angle) * (r + 7);
    let py = cy + Math.sin(angle) * (r + 7);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI*2);
    ctx.fill();
  }

  scene.textures.addCanvas('fusion_orb', canvas);
}

function createCanvasTexture(scene, cfg, isOpen) {
  const canvas = document.createElement('canvas'); canvas.width = 78; canvas.height = 78;
  const ctx = canvas.getContext('2d');
  
  ctx.save(); ctx.translate(39, 39); ctx.scale(0.8, 0.8); 
  ctx.shadowColor = cfg.glow; ctx.shadowBlur = 12; 
  
  ctx.beginPath();
  if (cfg.shape === 'diamond') { ctx.moveTo(0, -32); ctx.bezierCurveTo(30, -14, 32, 10, 0, 30); ctx.bezierCurveTo(-32, 10, -30, -14, 0, -32); }
  else if (cfg.shape === 'droplet') { ctx.moveTo(0, -34); ctx.bezierCurveTo(30, -10, 32, 26, 0, 26); ctx.bezierCurveTo(-32, 26, -30, -10, 0, -34); }
  else if (cfg.shape === 'star') { ctx.moveTo(0, -32); ctx.quadraticCurveTo(8, -8, 32, 0); ctx.quadraticCurveTo(8, 8, 0, 32); ctx.quadraticCurveTo(-8, 8, -32, 0); ctx.quadraticCurveTo(-8, -8, 0, -32); }
  else if (cfg.shape === 'round') { ctx.arc(0, 0, 26, 0, Math.PI * 2); }
  else if (cfg.shape === 'flame') { ctx.moveTo(0, -32); ctx.bezierCurveTo(16, -20, 30, -10, 28, 14); ctx.bezierCurveTo(24, 28, -24, 28, -28, 14); ctx.bezierCurveTo(-30, -10, -16, -20, 0, -32); }
  else if (cfg.shape === 'hexagon') { for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; const x = Math.cos(a) * 28; const y = Math.sin(a) * 28; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } }
  else if (cfg.shape === 'heart') { ctx.moveTo(0, 14); ctx.bezierCurveTo(-34, -14, -24, -38, 0, -20); ctx.bezierCurveTo(24, -38, 34, -14, 0, 14); }
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -30, 0, 30);
  grad.addColorStop(0, cfg.glow); grad.addColorStop(0.3, cfg.light); grad.addColorStop(1, cfg.base);
  ctx.fillStyle = grad; ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.shadowBlur = 0; ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.ellipse(0, -18, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, cfg.faceY);
  ctx.fillStyle = 'rgba(255, 110, 140, 0.7)'; ctx.beginPath(); ctx.ellipse(-14, 6, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(14, 6, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#1A1025'; ctx.strokeStyle = '#1A1025'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!isOpen) { 
    ctx.beginPath();
    if (cfg.name === 'solar' || cfg.name === 'terra') { ctx.moveTo(-15, -1); ctx.lineTo(-7, -1); ctx.moveTo(15, -1); ctx.lineTo(7, -1); }
    else if (cfg.name === 'cosmic' || cfg.name === 'nova') { ctx.arc(-11, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(6, 0); ctx.arc(11, 1, 4.5, Math.PI * 1.1, Math.PI * 1.9); }
    else if (cfg.name === 'blaze') { ctx.moveTo(-15, -4); ctx.lineTo(-9, -1); ctx.moveTo(15, -4); ctx.lineTo(9, -1); }
    else { ctx.arc(-11, -2, 4, Math.PI * 0.1, Math.PI * 0.9); ctx.moveTo(15, -2); ctx.arc(11, -2, 4, Math.PI * 0.1, Math.PI * 0.9); }
    ctx.stroke();
    ctx.beginPath();
    if (cfg.name === 'blaze' || cfg.name === 'solar') { ctx.moveTo(-3, 5); ctx.lineTo(3, 5); } else { ctx.arc(0, 4, 3, 0.1, Math.PI * 0.9); }
    ctx.stroke();
  } else { 
    [-11, 11].forEach(x => { ctx.fillStyle = '#1A1025'; ctx.beginPath(); ctx.arc(x, -1, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 1.5, -3, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x - 2, 1, 1, 0, Math.PI * 2); ctx.fill(); });
    if (cfg.name === 'blaze') { ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(-8, -7); ctx.moveTo(16, -9); ctx.lineTo(8, -7); ctx.stroke(); }
    ctx.fillStyle = '#1A1025'; ctx.beginPath();
    if (cfg.name === 'verdant' || cfg.name === 'nova') { ctx.arc(-3, 5, 3, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 5, 3, 0, Math.PI); ctx.stroke(); }
    else if (cfg.name === 'solar' || cfg.name === 'terra') { ctx.arc(0, 5, 4.5, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, Math.PI); ctx.fill(); }
    else { ctx.arc(0, 5, 3.5, 0, Math.PI); ctx.fill(); }
  }
  ctx.restore(); ctx.restore(); 
  scene.textures.addCanvas(`${cfg.name}_${isOpen ? 'open' : 'closed'}`, canvas);
}

function generateBoosterIcons(scene) {
  let c1 = document.createElement('canvas'); c1.width = 40; c1.height = 40; let ctx1 = c1.getContext('2d');
  ctx1.strokeStyle = '#38BDF8'; ctx1.lineWidth = 4; ctx1.lineCap = 'round';
  ctx1.beginPath(); ctx1.arc(20, 20, 12, 0.5, Math.PI - 0.5); ctx1.stroke(); ctx1.beginPath(); ctx1.arc(20, 20, 12, Math.PI + 0.5, Math.PI * 2 - 0.5); ctx1.stroke();
  ctx1.fillStyle = '#38BDF8'; ctx1.beginPath(); ctx1.moveTo(35, 12); ctx1.lineTo(27, 8); ctx1.lineTo(31, 18); ctx1.fill(); ctx1.beginPath(); ctx1.moveTo(5, 28); ctx1.lineTo(13, 32); ctx1.lineTo(9, 22); ctx1.fill();
  scene.textures.addCanvas('icon_shuffle', c1);

  let c2 = document.createElement('canvas'); c2.width = 40; c2.height = 40; let ctx2 = c2.getContext('2d');
  ctx2.fillStyle = '#1A1025'; ctx2.strokeStyle = '#A855F7'; ctx2.lineWidth = 3;
  ctx2.beginPath(); ctx2.arc(18, 22, 12, 0, Math.PI*2); ctx2.fill(); ctx2.stroke();
  ctx2.strokeStyle = '#FFFFFF'; ctx2.beginPath(); ctx2.moveTo(25, 12); ctx2.quadraticCurveTo(28, 8, 32, 10); ctx2.stroke();
  ctx2.fillStyle = '#FBBF24'; ctx2.beginPath(); ctx2.arc(32, 10, 4, 0, Math.PI*2); ctx2.fill();
  scene.textures.addCanvas('icon_bomb', c2);

  let c3 = document.createElement('canvas'); c3.width = 40; c3.height = 40; let ctx3 = c3.getContext('2d');
  ctx3.fillStyle = '#F43F5E'; ctx3.beginPath();
  for (let i = 0; i < 12; i++) { const a = (Math.PI / 6) * i; const r = i % 2 === 0 ? 18 : 8; const x = 20 + Math.cos(a) * r; const y = 20 + Math.sin(a) * r; if(i===0) ctx3.moveTo(x,y); else ctx3.lineTo(x,y); }
  ctx3.fill(); ctx3.fillStyle = '#FBBF24'; ctx3.beginPath(); ctx3.arc(20, 20, 6, 0, Math.PI*2); ctx3.fill();
  scene.textures.addCanvas('icon_burst', c3);
}

// BUG-FREE UI DRAWING
function buildTopUI(scene) {
  const ui = scene.add.graphics().setDepth(5);
  
  ui.fillStyle(0xfbcfe8, 1); ui.fillRoundedRect(27, 21, 606, 102, 26); 
  ui.fillStyle(0x4a044e, 1); ui.fillRoundedRect(30, 24, 600, 96, 24); 

  const drawPanel = (x, w, title, val, valColor) => {
    ui.fillStyle(0x701a75, 1); ui.fillRoundedRect(x, 40, w, 66, 16);
    scene.add.text(x + w/2, 58, title, { fontSize: '11px', fontStyle: 'bold', color: '#f9a8d4', letterSpacing: 1 }).setOrigin(0.5).setDepth(6);
    return scene.add.text(x + w/2, 82, val, { fontSize: '26px', fontStyle: 'bold', color: valColor }).setOrigin(0.5).setDepth(6);
  };

  drawPanel(44, 110, 'LEVEL', `${currentLevel}`, '#FFFFFF');
  drawPanel(172, 316, 'TARGET', `${TARGET_SCORE}`, '#FFFFFF');
  movesText = drawPanel(504, 110, 'MOVES', `${movesRemaining}`, '#FCD34D');
}

function buildProgressBar(scene) {
  scoreText = scene.add.text(48, 128, 'SCORE: 0', { fontSize: '16px', fontStyle: 'bold', color: '#FFFFFF' }).setDepth(6);
  const ui = scene.add.graphics().setDepth(5);
  
  ui.fillStyle(0xfbcfe8, 1); ui.fillRoundedRect(40, 152, 580, 20, 10); 
  ui.fillStyle(0x4a044e, 1); ui.fillRoundedRect(42, 154, 576, 16, 8); 
  
  progressBar = scene.add.graphics().setDepth(6);
  
  [0.33, 0.66, 1.0].forEach((pct) => {
    const starX = 42 + 576 * pct, starY = 162;
    const starBgOuter = scene.add.circle(starX, starY, 16, 0xfbcfe8).setDepth(7);
    const starBgInner = scene.add.circle(starX, starY, 14, 0x701a75).setDepth(8);
    const starGlyph = scene.add.text(starX, starY - 1, '★', { fontSize: '14px', color: '#fbcfe8' }).setOrigin(0.5).setDepth(9);
    starIcons.push({ bgOuter: starBgOuter, bgInner: starBgInner, text: starGlyph, unlocked: false, threshold: TARGET_SCORE * pct, scene: scene });
  });
}

function updateScoreUI() {
  scoreText.setText(`SCORE: ${score}`);
  progressBar.clear();
  const fillWidth = Math.min(576, (score / TARGET_SCORE) * 576);
  if (fillWidth > 0) { 
      progressBar.fillStyle(0xFCD34D, 1); 
      progressBar.fillRoundedRect(42, 154, fillWidth, 16, 8); 
  }

  starIcons.forEach(star => {
    if (!star.unlocked && score >= star.threshold) {
      star.unlocked = true;
      star.bgOuter.setFillStyle(0xFFFFFF);
      star.bgInner.setFillStyle(0xFBBF24);
      star.text.setColor('#FFFFFF');
      star.scene.tweens.add({ targets: [star.bgOuter, star.bgInner, star.text], scale: 1.5, duration: 150, yoyo: true, ease: 'Back.easeOut' });
      createBurst(star.scene, star.bgOuter.x, star.bgOuter.y, 0xFBBF24, 6, 40);
    }
  });

  boosterButtons.forEach(btn => {
    const canAfford = score >= btn.cost;
    btn.gfx.setAlpha(canAfford ? 1 : 0.4); btn.icon.setAlpha(canAfford ? 1 : 0.4);
    btn.label.setAlpha(canAfford ? 1 : 0.4); btn.costText.setAlpha(canAfford ? 1 : 0.4);
    btn.canAfford = canAfford;
  });
}

function drawPinkBoardGrid(scene) {
  const bg = scene.add.graphics().setDepth(0);
  const boardW = GRID_COLS * TILE_SIZE + 16;
  const boardH = GRID_ROWS * TILE_SIZE + 16;
  const boardX = BOARD_OFFSET_X - 8;
  const boardY = BOARD_OFFSET_Y - 8;

  bg.fillStyle(0xfbcfe8, 1); bg.fillRoundedRect(boardX - 4, boardY - 4, boardW + 8, boardH + 8, 28);
  bg.fillStyle(0x4a044e, 1); bg.fillRoundedRect(boardX, boardY, boardW, boardH, 24);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const gap = 4;
      const cellX = BOARD_OFFSET_X + c * TILE_SIZE + gap;
      const cellY = BOARD_OFFSET_Y + r * TILE_SIZE + gap;
      const size = TILE_SIZE - (gap * 2);
      
      bg.fillStyle(0xf472b6, 0.9); bg.fillRoundedRect(cellX - 2, cellY - 2, size + 4, size + 4, 16);
      bg.fillStyle(0xbe185d, 1); bg.fillRoundedRect(cellX, cellY, size, size, 14);
    }
  }
}

// --- DYNAMICALLY ANCHORED BOOSTER DOCK ---
function buildBoosterDock(scene) {
  const ui = scene.add.graphics().setDepth(5);
  
  // Dock anchors dynamically to the bottom of the screen
  const dockY = GAME_HEIGHT - 163;
  const dockInnerY = GAME_HEIGHT - 160;
  const btnY = GAME_HEIGHT - 112;
  
  ui.fillStyle(0xfbcfe8, 1); ui.fillRoundedRect(39, dockY, 582, 102, 26);
  ui.fillStyle(0x4a044e, 1); ui.fillRoundedRect(42, dockInnerY, 576, 96, 24);

  const boosters = [ 
    { name: 'SHUFFLE', icon: 'icon_shuffle', cost: 100, action: () => applyShuffle(scene) }, 
    { name: 'BOMB', icon: 'icon_bomb', cost: 150, action: () => applyBomb(scene) }, 
    { name: 'BURST', icon: 'icon_burst', cost: 250, action: () => applyBurst(scene) } 
  ];

  boosters.forEach((b, i) => {
    const btnX = 138 + i * 192;
    const btnZone = scene.add.zone(btnX, btnY, 150, 70).setInteractive({ useHandCursor: true }).setDepth(10);
    const btnGfx = scene.add.graphics().setDepth(6);
    
    const drawBtn = (isDown) => {
      btnGfx.clear(); 
      btnGfx.fillStyle(0xf9a8d4, 1); btnGfx.fillRoundedRect(btnX - 77, btnY - 37, 154, 74, 18);
      btnGfx.fillStyle(isDown ? 0xbe185d : 0x701a75, 1); btnGfx.fillRoundedRect(btnX - 75, btnY - 35, 150, 70, 16);
    };
    drawBtn(false);

    const icon = scene.add.image(btnX - 45, btnY, b.icon).setDepth(7);
    const label = scene.add.text(btnX + 15, btnY - 8, b.name, { fontSize: '14px', fontStyle: 'bold', color: '#FFFFFF' }).setOrigin(0.5).setDepth(7);
    const costText = scene.add.text(btnX + 15, btnY + 12, `-${b.cost}`, { fontSize: '13px', fontStyle: 'bold', color: '#FCD34D' }).setOrigin(0.5).setDepth(7);

    const btnState = { gfx: btnGfx, icon: icon, label: label, costText: costText, cost: b.cost, canAfford: false };
    boosterButtons.push(btnState);

    btnZone.on('pointerdown', () => { 
      initAudio(scene); 
      if(btnState.canAfford && !isAnimating) {
        drawBtn(true); scene.tweens.add({ targets: [icon, label, costText], scale: 0.9, duration: 80 }); 
      }
    });
    btnZone.on('pointerup', () => { 
      if(btnState.canAfford && !isAnimating) {
        drawBtn(false); scene.tweens.add({ targets: [icon, label, costText], scale: 1, duration: 80, ease: 'Back.easeOut' }); 
        b.action(); 
      }
    });
    btnZone.on('pointerout', () => { 
      if(btnState.canAfford) { drawBtn(false); scene.tweens.add({ targets: [icon, label, costText], scale: 1, duration: 80 }); }
    });
  });
}
