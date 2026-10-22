// ==========================================
// SCENES.JS - OŻYWIONA BAZA (ANIMOWANI STRAŻNICY)
// ==========================================

const TILE_SIZE = 50; 

function drawBuildingTexture(scene, x, y, def, alpha = 1) {
  let container = scene.add.container(x, y);
  let graphics = scene.add.graphics();
  
  graphics.fillStyle(def.color, alpha);
  graphics.lineStyle(2, 0x000000, alpha);
  
  const w = TILE_SIZE / 2; 
  const h = TILE_SIZE / 4; 
  
  graphics.beginPath();
  graphics.moveTo(0, -h);      
  graphics.lineTo(w, 0);       
  graphics.lineTo(0, h);       
  graphics.lineTo(-w, 0);      
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();

  graphics.fillStyle(0x000000, 0.4 * alpha);
  graphics.beginPath();
  graphics.moveTo(-w, 0); graphics.lineTo(0, h); graphics.lineTo(0, h + 20); graphics.lineTo(-w, 20);
  graphics.closePath(); graphics.fillPath();

  graphics.fillStyle(0x000000, 0.2 * alpha);
  graphics.beginPath();
  graphics.moveTo(w, 0); graphics.lineTo(0, h); graphics.lineTo(0, h + 20); graphics.lineTo(w, 20);
  graphics.closePath(); graphics.fillPath();

  let detail = scene.add.text(0, 0, def.short, { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(alpha);
  
  container.add([graphics, detail]);
  container.setDepth(y);
  
  return container;
}

class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }
  
  create() {
    generateRivals(); 
    baseSceneInstance = this; 
    let cam = this.cameras.main;
    
    cam.setBackgroundColor('#2d4a22'); 

    // Tło (trawa)
    let bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x2d4a22, 1); 
    bgGraphics.fillRect(-5000, -5000, 10000, 10000); 
    bgGraphics.setDepth(-10);

    // Siatka
    let gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x000000, 0.15);
    for (let i = 0; i <= GRID * 2; i++) {
      gridGraphics.lineBetween((i * TILE_SIZE) / 2, 0, (i * TILE_SIZE) / 2 + (GRID * TILE_SIZE), (GRID * TILE_SIZE));
      gridGraphics.lineBetween((i * TILE_SIZE) / 2, 0, (i * TILE_SIZE) / 2 - (GRID * TILE_SIZE), (GRID * TILE_SIZE));
    }

    window.preview = this.add.graphics().setVisible(false).setDepth(9999);
    
    buildings = []; 
    try { loadGame().forEach(b => this.createBuilding(b.gridX, b.gridY, b.type, false, b.level || 1, b.hp || null)); } catch (e) {}
    updateUI(); updateSoundButton(); updateDailyButtonState();

    this.lastGridX = -1; this.lastGridY = -1;
    
    const getIsoX = (gridX, gridY) => (gridX - gridY) * (TILE_SIZE / 2);
    const getIsoY = (gridX, gridY) => (gridX + gridY) * (TILE_SIZE / 4);

    this.input.on('pointerdown', (p) => {
      this.lastGridX = -1; this.lastGridY = -1;
      if (selectedBuildingType === 'wall') this.tryPlaceBuilding(p);
    });
    
    this.input.on('pointermove', (p) => {
      if (selectedBuildingType) {
        let isoX = p.worldX / (TILE_SIZE / 2);
        let isoY = p.worldY / (TILE_SIZE / 4);
        let gridX = Math.round((isoY + isoX) / 2);
        let gridY = Math.round((isoY - isoX) / 2);
        
        let screenX = getIsoX(gridX, gridY);
        let screenY = getIsoY(gridX, gridY);
        
        if (window.preview) {
          window.preview.clear();
          window.preview.fillStyle(BUILDINGS[selectedBuildingType].color, 0.6);
          window.preview.lineStyle(2, 0xffffff, 1);
          window.preview.beginPath();
          window.preview.moveTo(screenX, screenY - TILE_SIZE/4);
          window.preview.lineTo(screenX + TILE_SIZE/2, screenY);
          window.preview.lineTo(screenX, screenY + TILE_SIZE/4);
          window.preview.lineTo(screenX - TILE_SIZE/2, screenY);
          window.preview.closePath();
          window.preview.fillPath();
          window.preview.strokePath();
          window.preview.setVisible(true);
        }
        
        if (selectedBuildingType === 'wall' && p.isDown) {
            let now = Date.now();
            if (now - (this.lastWallTime || 0) > 50) { this.tryPlaceBuilding(p); this.lastWallTime = now; }
        }
      } else if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x); 
        cam.scrollY -= (p.y - p.prevPosition.y);
      }
    });
    
    this.input.on('pointerup', (p) => { 
        if (selectedBuildingType && selectedBuildingType !== 'wall') this.tryPlaceBuilding(p); 
        if (window.preview) window.preview.setVisible(false); 
    });
    
    cam.setZoom(2.5); 
    this.centerCamera();
    
    // URUCHAMIAMY STRAŻNIKÓW
    this.spawnPatrols();
  }

  // --- NOWY SYSTEM PATROLOWANIA ---
  spawnPatrols() {
    this.patrols = [];
    
    // Tworzymy 4 grupy strażników
    for (let i = 0; i < 4; i++) {
      let startX = Phaser.Math.Between(-100, 100);
      let startY = Phaser.Math.Between(-100, 100);
      
      // Losujemy wygląd jednostki (miecznik lub łucznik)
      let unitIcon = Phaser.Math.RND.pick(['⚔️', '🏹']);
      let unitColor = unitIcon === '⚔️' ? '#4a5c38' : '#5c4305';
      
      let sprite = this.add.text(startX, startY, unitIcon, { 
          fontSize: '20px', 
          backgroundColor: unitColor,
          padding: { x: 2, y: 2 }
      }).setOrigin(0.5).setDepth(startY + 100);
      
      let unit = { sprite: sprite, targetX: startX, targetY: startY, speed: Phaser.Math.FloatBetween(20, 50) };
      this.patrols.push(unit);
      
      // Funkcja rekurencyjna do losowego chodzenia
      this.movePatrol(unit);
    }
  }

  movePatrol(unit) {
    if (!unit.sprite.active) return; // Jeśli jednostka zniknęła, przerywamy

    // Losujemy nowy cel w promieniu 150 pikseli
    let targetX = unit.sprite.x + Phaser.Math.Between(-150, 150);
    let targetY = unit.sprite.y + Phaser.Math.Between(-150, 150);
    
    // Obliczamy czas dotarcia do celu
    let distance = Phaser.Math.Distance.Between(unit.sprite.x, unit.sprite.y, targetX, targetY);
    let duration = (distance / unit.speed) * 1000;
    
    // Animacja ruchu
    this.tweens.add({
        targets: unit.sprite,
        x: targetX,
        y: targetY,
        duration: duration,
        ease: 'Linear',
        onUpdate: () => {
            // Aktualizujemy głębię (żeby jednostka była za budynkami, gdy jest wyżej)
            unit.sprite.setDepth(unit.sprite.y + 100);
        },
        onComplete: () => {
            // Po dotarciu do celu, czekamy chwilę i ruszamy dalej
            this.time.delayedCall(Phaser.Math.Between(1000, 3000), () => {
                this.movePatrol(unit);
            });
        }
    });
  }

  centerCamera() {
    let target = buildings.find(b => b.type === 'townhall') || buildings[0];
    let gridX = target ? target.gridX : Math.floor(GRID/2);
    let gridY = target ? target.gridY : Math.floor(GRID/2);
    
    let cx = (gridX - gridY) * (TILE_SIZE / 2);
    let cy = (gridX + gridY) * (TILE_SIZE / 4);
    
    this.cameras.main.pan(cx, cy, 300, 'Sine.easeInOut');
  }

  update(time, delta) {
    prodTimer += delta;
    if (prodTimer >= 1000) {
      let aG = 0, aE = 0;
      
      buildings.forEach(b => {
        let def = BUILDINGS[b.type];
        let goldProd = (def.prod.gold || 0) * b.level;
        let elixirProd = (def.prod.elixir || 0) * b.level;

        if (goldProd > 0) {
            this.spawnProductionText(b.x, b.y - 20, '+' + goldProd + ' 💰', '#ffd700');
            aG += goldProd;
        }
        if (elixirProd > 0) {
            this.spawnProductionText(b.x, b.y - 20, '+' + elixirProd + ' 🔮', '#ba55d3');
            aE += elixirProd;
        }
      });

      if (aG > 0 || aE > 0) { gold += aG; elixir += aE; updateUI(); }
      prodTimer = 0;
    }
  }

  spawnProductionText(x, y, text, color) {
    let offsetX = Phaser.Math.Between(-15, 15);
    let offsetY = Phaser.Math.Between(-5, 5);
    
    let prodText = this.add.text(x + offsetX, y + offsetY, text, {
        fontSize: '14px', color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(9999);

    this.tweens.add({
        targets: prodText, y: y - 60, alpha: 0, duration: 1500, ease: 'Cubic.easeOut',
        onComplete: () => prodText.destroy()
    });
  }

  tryPlaceBuilding(p) {
    let isoX = p.worldX / (TILE_SIZE / 2);
    let isoY = p.worldY / (TILE_SIZE / 4);
    let gridX = Math.round((isoY + isoX) / 2);
    let gridY = Math.round((isoY - isoX) / 2);
    
    if (gridX === this.lastGridX && gridY === this.lastGridY) return;
    if (gridX < 0 || gridY < 0 || gridX >= GRID || gridY >= GRID) return;
    if (buildings.some(b => b.gridX === gridX && b.gridY === gridY)) return;
    
    const def = BUILDINGS[selectedBuildingType];
    if (gold < def.cost.gold) { 
      if (Date.now() > lastGoldWarningTime) { showMessage('Za mało złota!', 'error'); lastGoldWarningTime = Date.now() + 1500; }
      return; 
    }
    if (elixir < def.cost.elixir) { showMessage('Za mało Many!', 'error'); return; }

    gold -= def.cost.gold; elixir -= def.cost.elixir; addXP(10); 
    if (selectedBuildingType === 'mine') updateQuest('build_mine', 1);
    if (selectedBuildingType === 'altar') updateQuest('build_altar', 1);

    playSound('build'); this.createBuilding(gridX, gridY, selectedBuildingType, true, 1);
    this.lastGridX = gridX; this.lastGridY = gridY;
    updateUI(); saveGame();
  }

  createBuilding(gridX, gridY, type, isNew, level, hp = null) {
    const def = BUILDINGS[type];
    
    let screenX = (gridX - gridY) * (TILE_SIZE / 2);
    let screenY = (gridX + gridY) * (TILE_SIZE / 4);
    
    const container = drawBuildingTexture(this, screenX, screenY, def, 1);
    container.type = type; 
    
    const label = this.add.text(screenX, screenY + 25, def.name + ' L' + level, { fontSize: '10px', color: '#fff', fontStyle: 'bold', backgroundColor: '#00000088', padding:{x:3,y:1} }).setOrigin(0.5).setDepth(screenY + 1);
    const hpBarBg = this.add.rectangle(screenX, screenY - 35, 30, 5, 0x000000).setDepth(screenY + 1);
    const hpBar = this.add.rectangle(screenX - 15, screenY - 35, 30, 5, 0x00ff00).setOrigin(0, 0.5).setDepth(screenY + 1);
    
    container.setSize(TILE_SIZE, TILE_SIZE).setInteractive({ useHandCursor: true });
    container.gridX = gridX; container.gridY = gridY; container.level = level;
    container.label = label; container.hpBar = hpBar;
    container.x = screenX; container.y = screenY;
    
    container.hp = hp !== null ? hp : def.hp * level; 
    container.maxHp = def.hp * level; 
    container.hpBar.scaleX = container.hp / container.maxHp;

    container.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation(); if (selectedBuildingType) return; openBuildingPanel(container);
    });
    buildings.push(container); 
    if (isNew && window.preview) window.preview.setVisible(false);
    
    saveGame();
  }
}

// --- SCENA BITWY ---
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  create() {
    let cam = this.cameras.main; 
    cam.setBackgroundColor('#2d4a22'); 
    
    let bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x2d4a22, 1);
    bgGraphics.fillRect(-5000, -5000, 10000, 10000);
    bgGraphics.setDepth(-10);

    cam.setZoom(2.5);
    cam.centerOn(0, 0);
    
    this.enemyBuildings = []; this.troops = []; this.battleEnded = false;
    this.lootGold = 0; this.lootElixir = 0; this.lastDamageText = 0; this.destroyedCount = 0; this.totalEnemyBuildings = 0; 
    
    this.battleTime = 180; 
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (this.battleEnded) return;
        this.battleTime--; let m = Math.floor(this.battleTime / 60); let s = this.battleTime % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (this.battleTime <= 0) { this.battleEnded = true; setTimeout(() => endBattle(false, this.lootGold, this.lootElixir, this.destroyedCount, this.totalEnemyBuildings), 1000); }
    }});

    document.getElementById('loot-display').innerText = '0 💰, 0 🔮';
    
    let centerX = Math.floor(GRID / 2); let centerY = Math.floor(GRID / 2);
    this.createEnemyBuilding(centerX, centerY, 400, 'townhall', false, 200, 100); this.totalEnemyBuildings++;

    let numBuildings = Phaser.Math.Between(6, 9);
    for(let i = 0; i < numBuildings; i++) {
        let ex = Phaser.Math.Between(2, GRID - 2); let ey = Phaser.Math.Between(2, GRID - 2);
        let valid = true;
        for (let b of this.enemyBuildings) { if (Math.abs(ex - b.gridX) < 2 && Math.abs(ey - b.gridY) < 2) { valid = false; break; } }
        
        if (valid) {
            let typeRnd = Phaser.Math.Between(1, 10);
            if (typeRnd <= 3) this.createEnemyBuilding(ex, ey, 150, 'tower', true, 0, 0);
            else if (typeRnd <= 6) this.createEnemyBuilding(ex, ey, 100, 'mine', false, 300, 0);
            else if (typeRnd <= 8) this.createEnemyBuilding(ex, ey, 150, 'barracks', false, 0, 200);
            else this.createEnemyBuilding(ex, ey, 250, 'wall', false, 0, 0);
            this.totalEnemyBuildings++;
        }
    }

    this.time.addEvent({ delay: 1500, loop: true, callback: this.towersShoot, callbackScope: this });
    
    this.input.on('pointerdown', (pointer) => {
      if (this.battleEnded) return;
      if (army[selectedBattleTroopType] > 0) {
        this.spawnTroop(pointer.x, pointer.y, selectedBattleTroopType);
        army[selectedBattleTroopType]--; updateUI(); playSound('shoot');
        if (selectedBattleTroopType === 'hero') checkHeroAvailability();
      } else { showMessage("Brak tej jednostki!", 'error'); }
    });
  }
  
  createEnemyBuilding(gridX, gridY, hp, type, isDefense, lootG, lootE) {
    const def = BUILDINGS[type]; 
    let screenX = (gridX - gridY) * (TILE_SIZE / 2); 
    let screenY = (gridX + gridY) * (TILE_SIZE / 4);
    let container = drawBuildingTexture(this, screenX, screenY, def, 1); 
    let hpBar = this.add.rectangle(screenX - 15, screenY - 35, 30, 5, 0x00ff00).setOrigin(0, 0.5).setDepth(screenY + 1);
    this.enemyBuildings.push({ container: container, sprite: container, hpBar: hpBar, hp: hp, maxHp: hp, gridX: gridX, gridY: gridY, x: screenX, y: screenY, alive: true, isDefense: isDefense, lootG: lootG, lootE: lootE, type: type });
  }
  
  spawnTroop(x, y, type) {
    const def = getTroopStats(type); let bgColor = '#4a5c38'; 
    if (type === 'hero') bgColor = '#8b0000'; 
    if (type === 'wallbreaker') bgColor = '#ff8c00'; 
    let size = (type === 'hero') ? '24px' : '16px';
    const troopSprite = this.add.text(x, y, def.short, { fontSize: size, color: '#fff', fontStyle: 'bold', backgroundColor: bgColor, padding: {x: (type==='hero'?6:3), y: (type==='hero'?6:3)} }).setOrigin(0.5).setDepth(y + 100);
    const hpBar = this.add.rectangle(x - 10, y - (type==='hero'?24:18), (type==='hero'?30:18), 4, 0x00ff00).setOrigin(0, 0.5).setDepth(y + 100);
    this.troops.push({ type: type, def: def, sprite: troopSprite, hpBar: hpBar, x: x, y: y, target: null, hp: def.hp, maxHp: def.hp });
  }
  
  showDamageText(x, y, amount) {
    let dmgText = this.add.text(x, y - 20, '-' + Math.floor(amount), { fontSize: '14px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5).setDepth(9999);
    this.tweens.add({ targets: dmgText, y: y - 50, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });
  }
  
  explode(x, y, color) {
    let blast = this.add.circle(x, y, 15, color, 0.8).setDepth(9999);
    this.tweens.add({ targets: blast, scale: 3, alpha: 0, duration: 400, onComplete: () => blast.destroy() });
  }
  
  towersShoot() {
    if (this.battleEnded) return;
    this.enemyBuildings.forEach(tower => {
      if (tower.alive && tower.isDefense) {
        let nearestTroop = null; let minDist = 300; 
        this.troops.forEach(troop => {
          const dist = Phaser.Math.Distance.Between(tower.x, tower.y, troop.x, troop.y);
          if (dist < minDist) { minDist = dist; nearestTroop = troop; }
        });
        if (nearestTroop) {
          const laser = this.add.line(0, 0, tower.x, tower.y, nearestTroop.x, nearestTroop.y, 0xff0000).setDepth(9999);
          laser.setOrigin(0, 0); laser.setLineWidth(3); setTimeout(() => laser.destroy(), 150); 
          nearestTroop.hp -= 25; this.showDamageText(nearestTroop.x, nearestTroop.y, 25); playSound('shoot');
        }
      }
    });
  }
  
  update(time, delta) {
    if (this.battleEnded) return;
    const dt = delta / 1000; 
    for (let i = this.troops.length - 1; i >= 0; i--) {
      let troop = this.troops[i];
      if (troop.hp <= 0) { troop.sprite.destroy(); troop.hpBar.destroy(); this.troops.splice(i, 1); continue; }
      let barWidth = (troop.type === 'hero') ? 30 : 18;
      troop.hpBar.width = barWidth * (troop.hp / troop.maxHp); troop.hpBar.setPosition(troop.x - barWidth/2, troop.y - (troop.type==='hero'?24:18));
      
      if (!troop.target || !troop.target.alive) troop.target = this.findNearestBuilding(troop.x, troop.y, troop.def.target);
      
      if (troop.target) {
        const dist = Phaser.Math.Distance.Between(troop.x, troop.y, troop.target.x, troop.target.y);
        
        if (troop.type === 'wallbreaker' && dist <= troop.def.range) {
          this.explode(troop.target.x, troop.target.y, 0xff8c00); this.explode(troop.x, troop.y, 0xff0000); playSound('boom');
          troop.target.hp -= 1000;
          this.enemyBuildings.forEach(b => { if (b.alive && Phaser.Math.Distance.Between(troop.x, troop.y, b.x, b.y) < 80) b.hp -= 300; });
          troop.hp = 0; continue;
        }
        
        if (dist > troop.def.range) {
          const angle = Phaser.Math.Angle.Between(troop.x, troop.y, troop.target.x, troop.target.y);
          troop.x += Math.cos(angle) * troop.def.speed * dt; troop.y += Math.sin(angle) * troop.def.speed * dt; troop.sprite.setPosition(troop.x, troop.y);
        } else {
          let dmg = troop.def.damage * dt; troop.target.hp -= dmg; troop.target.hpBar.scaleX = Math.max(0, troop.target.hp / troop.target.maxHp);
          if (time > this.lastDamageText + 200) { this.showDamageText(troop.target.x + Phaser.Math.Between(-20, 20), troop.target.y, dmg * 5); this.lastDamageText = time; }
          if (troop.target.hp <= 0) {
            troop.target.alive = false; this.explode(troop.target.x, troop.target.y, 0xffaa00); playSound('boom');
            this.destroyedCount++; 
            if (troop.target.type === 'wall') updateQuest('destroy_walls', 1);
            troop.target.sprite.destroy(); troop.target.hpBar.destroy(); 
            if (troop.target.lootG > 0 || troop.target.lootE > 0) {
              this.lootGold += troop.target.lootG; this.lootElixir += troop.target.lootE;
              document.getElementById('loot-display').innerText = `${this.lootGold} 💰, ${this.lootElixir} 🔮`;
              this.showDamageText(troop.target.x, troop.target.y, '+' + troop.target.lootG + ' 💰'); playSound('coin');
            }
            troop.target = null; 
          }
        }
      }
    }
    if (this.enemyBuildings.filter(b => b.alive).length === 0) {
      this.battleEnded = true; setTimeout(() => endBattle(true, this.lootGold, this.lootElixir, this.destroyedCount, this.totalEnemyBuildings), 1000);
    } else if (army.barbarian + army.archer + army.giant + army.wallbreaker + army.hero === 0 && this.troops.length === 0 && !this.battleEnded) {
      this.battleEnded = true; setTimeout(() => endBattle(false, this.lootGold, this.lootElixir, this.destroyedCount, this.totalEnemyBuildings), 1000);
    }
  }
  
  findNearestBuilding(x, y, targetType) {
    let nearest = null, minDist = Infinity;
    this.enemyBuildings.forEach(b => {
      if (b.alive) {
        const hasDefenses = this.enemyBuildings.some(eb => eb.alive && eb.isDefense);
        if (targetType === 'defense' && hasDefenses && !b.isDefense) return;
        if (targetType === 'wall') {
          const hasWalls = this.enemyBuildings.some(eb => eb.alive && eb.type === 'wall');
          if (hasWalls && b.type !== 'wall') return;
        }
        const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
        if (dist < minDist) { minDist = dist; nearest = b; }
      }
    });
    return nearest;
  }
}

// --- SCENA OBRONY ---
class DefenseScene extends Phaser.Scene {
  constructor() { super('DefenseScene'); }
  create() {
    let cam = this.cameras.main; 
    cam.setBackgroundColor('#2d4a22'); 
    
    let bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x2d4a22, 1);
    bgGraphics.fillRect(-5000, -5000, 10000, 10000);
    bgGraphics.setDepth(-10);

    this.playerBuildings = []; const saved = loadGame(); 
    saved.forEach(b => {
      const def = BUILDINGS[b.type]; 
      let screenX = (b.gridX - b.gridY) * (TILE_SIZE / 2); 
      let screenY = (b.gridX + b.gridY) * (TILE_SIZE / 4);
      
      let container = drawBuildingTexture(this, screenX, screenY, def, 1);
      const label = this.add.text(screenX, screenY + 25, def.name + ' L' + b.level, { fontSize: '10px', color: '#fff', backgroundColor:'#00000088', padding:{x:3,y:1} }).setOrigin(0.5).setDepth(screenY + 1);
      const hpBar = this.add.rectangle(screenX - 15, screenY - 35, 30, 5, 0x00ff00).setOrigin(0, 0.5).setDepth(screenY + 1);
      
      this.playerBuildings.push({ sprite: container, rect: container, hpBar: hpBar, gridX: b.gridX, gridY: b.gridY, x: screenX, y: screenY, hp: b.hp, maxHp: b.maxHp, type: b.type, level: b.level, alive: true, isDefense: (b.type === 'tower') });
    });
    
    let centerX = Math.floor(GRID/2); let centerY = Math.floor(GRID/2);
    let isoCenterX = (centerX - centerY) * (TILE_SIZE / 2);
    let isoCenterY = (centerX + centerY) * (TILE_SIZE / 4);
    
    cam.setZoom(2.5);
    cam.centerOn(isoCenterX, isoCenterY);
    this.centerBase = { x: isoCenterX, y: isoCenterY };

    this.enemies = []; this.waveCount = 0; this.battleEnded = false; this.mortarCooldown = 0; 
    this.spawnWave();
    
    this.time.addEvent({ delay: 1500, loop: true, callback: () => {
        if (this.battleEnded) return;
        this.playerBuildings.forEach(tower => {
          if (tower.alive && tower.isDefense) {
            let target = this.enemies.find(e => e.alive && Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) < 400);
            if (target) {
              const laser = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0x00ffff).setDepth(9999);
              laser.setOrigin(0, 0); laser.setLineWidth(4); setTimeout(() => laser.destroy(), 150); target.hp -= 30; playSound('shoot');
            }
          }
        });
    }});
    
    this.input.on('pointerdown', (pointer) => {
      if (this.battleEnded || this.mortarCooldown > 0) return;
      const clickX = pointer.worldX; const clickY = pointer.worldY;
      const blast = this.add.circle(clickX, clickY, 60, 0xffaa00, 0.6).setDepth(9999); this.time.delayedCall(200, () => blast.destroy()); playSound('boom');
      this.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const dist = Phaser.Math.Distance.Between(clickX, clickY, enemy.x, enemy.y);
        if (dist <= 60) enemy.hp -= 100;
      });
      this.mortarCooldown = 3000; document.getElementById('defense-status').innerText = '🛡️ Moździerz: Ładuje (3s)';
      this.time.addEvent({ delay: 1000, repeat: 2, callback: () => {
          if (this.battleEnded) return;
          this.mortarCooldown -= 1000;
          if (this.mortarCooldown <= 0) document.getElementById('defense-status').innerText = '🛡️ Moździerz: Gotowy';
          else document.getElementById('defense-status').innerText = `🛡️ Moździerz: ${this.mortarCooldown/1000}s`;
      }});
    });
    this.time.addEvent({ delay: 10000, loop: true, callback: () => { if (!this.battleEnded) this.spawnWave(); } });
  }
  
  spawnWave() {
    this.waveCount++; const numEnemies = 2 + this.waveCount * 2; 
    for (let i = 0; i < numEnemies; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2); const distance = Phaser.Math.Between(400, 600); 
      const x = this.centerBase.x + Math.cos(angle) * distance; const y = this.centerBase.y + Math.sin(angle) * distance;
      const sprite = this.add.text(x, y, '🩸', { fontSize: '18px', color: '#fff', backgroundColor: '#8b0000', padding: {x:3, y:3} }).setOrigin(0.5).setDepth(y + 100);
      const hpBar = this.add.rectangle(x - 10, y - 18, 20, 4, 0x00ff00).setOrigin(0, 0.5).setDepth(y + 100);
      this.enemies.push({ sprite, hpBar, x, y, hp: 100, maxHp: 100, target: null, alive: true, damage: 15, speed: 80 });
    }
  }
  
  update(time, delta) {
    if (this.battleEnded) return;
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];
      if (enemy.hp <= 0) { enemy.alive = false; enemy.sprite.destroy(); enemy.hpBar.destroy(); this.enemies.splice(i, 1); continue; }
      enemy.hpBar.width = 20 * (enemy.hp / enemy.maxHp); enemy.hpBar.setPosition(enemy.x - 10, enemy.y - 18);
      if (!enemy.target || !enemy.target.alive) {
        let nearest = null, minDist = Infinity;
        this.playerBuildings.forEach(b => { if (b.alive) { const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, b.x, b.y); if (dist < minDist) { minDist = dist; nearest = b; } } });
        enemy.target = nearest;
      }
      if (enemy.target) {
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
        if (dist > 30) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
          enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt; enemy.sprite.setPosition(enemy.x, enemy.y);
        } else {
          enemy.target.hp -= enemy.damage * dt; enemy.target.hpBar.scaleX = Math.max(0, enemy.target.hp / enemy.target.maxHp);
          if (enemy.target.hp <= 0) { enemy.target.alive = false; enemy.target.sprite.destroy(); enemy.target = null; playSound('boom'); }
        }
      }
    }
    const alivePlayerBuildings = this.playerBuildings.filter(b => b.alive);
    if (alivePlayerBuildings.length === 0) { this.battleEnded = true; setTimeout(() => endDefense(false), 1000); } 
    else if (this.waveCount >= 3 && this.enemies.length === 0) { this.battleEnded = true; setTimeout(() => endDefense(true), 1000); }
  }
}

const config = {
  type: Phaser.CANVAS, 
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d4a22',
  render: { clearBeforeRender: false },
  scene: [BaseScene, BattleScene, DefenseScene]
};
const game = new Phaser.Game(config);