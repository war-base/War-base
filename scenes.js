function drawBuildingTexture(scene, x, y, def, alpha = 1) {
  let container = scene.add.container(x, y);
  
  let shadow = scene.add.ellipse(0, TILE/2 - 5, TILE - 10, 15, 0x000000, 0.4 * alpha);
  let base = scene.add.rectangle(0, 5, TILE - 12, TILE - 16, def.color).setStrokeStyle(2, 0x000000).setAlpha(alpha);
  let roof = scene.add.rectangle(0, -12, TILE - 8, TILE/2, def.roofColor).setStrokeStyle(2, 0x000000).setAlpha(alpha);
  let detail = scene.add.text(0, -12, def.short, { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(alpha);

  if (def.name !== 'Mur') {
    let window1 = scene.add.rectangle(-10, 5, 6, 10, 0x111111).setAlpha(alpha);
    let window2 = scene.add.rectangle(10, 5, 6, 10, 0x111111).setAlpha(alpha);
    container.add([shadow, base, roof, window1, window2, detail]);
  } else {
    let brick1 = scene.add.rectangle(0, 5, TILE - 12, 4, 0x000000).setAlpha(0.3 * alpha);
    let brick2 = scene.add.rectangle(0, 15, TILE - 12, 4, 0x000000).setAlpha(0.3 * alpha);
    container.add([shadow, base, roof, brick1, brick2, detail]);
  }
  
  return container;
}

class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }
  create() {
    baseSceneInstance = this; 
    let cam = this.cameras.main;
    let grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2b3625, 1, 0x3e4a35, 1);
    grid.setOrigin(0, 0);

    for(let i=0; i<150; i++) {
        let rx = Phaser.Math.Between(0, TILE*GRID);
        let ry = Phaser.Math.Between(0, TILE*GRID);
        this.add.circle(rx, ry, Phaser.Math.Between(2, 5), 0x1a2415, 0.5);
    }
    
    window.preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(10);
    this.fpsText = this.add.text(10, 50, 'FPS: 0', { fontSize: '14px', color: '#00ff00', backgroundColor: '#00000088', padding: {x: 10, y: 10} }).setScrollFactor(0).setDepth(20);

    buildings = []; 
    try { 
      loadGame().forEach(b => {
        let finalBuildTime = b.buildEndTime;
        if (finalBuildTime > 0 && Date.now() >= finalBuildTime) {
          finalBuildTime = 0; 
        }
        this.createBuilding(b.gridX, b.gridY, b.type, false, b.level || 1, b.hp || null, finalBuildTime); 
      }); 
    } catch (e) {}
    
    updateUI(); updateSoundButton(); updateDailyButtonState();

    this.lastGridX = -1; this.lastGridY = -1;
    this.lastWallTime = 0; 
    
    this.input.on('pointerdown', (p) => {
      this.lastGridX = -1; this.lastGridY = -1;
      if (selectedBuildingType === 'wall') this.tryPlaceBuilding(p);
    });
    
    this.input.on('pointermove', (p) => {
      if (selectedBuildingType) {
        let gridX = Math.floor(p.worldX / TILE);
        let gridY = Math.floor(p.worldY / TILE);
        let screenX = gridX * TILE + TILE/2;
        let screenY = gridY * TILE + TILE/2;
        if (window.preview) { 
            window.preview.setFillStyle(BUILDINGS[selectedBuildingType].color, 0.6); 
            window.preview.setPosition(screenX, screenY).setVisible(true); 
        }
        
        if (selectedBuildingType === 'wall' && p.isDown) {
            let now = Date.now();
            if (now - this.lastWallTime > 50) { 
                this.tryPlaceBuilding(p);
                this.lastWallTime = now;
            }
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
    
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); 
    cam.setZoom(1.0); 
    centerCamera(); 
  }

  update(time, delta) {
    if (this.fpsText) this.fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));
    
    prodTimer += delta;
    if (prodTimer >= 1000) {
      let aG = 0, aE = 0;
      // Sprawdzamy czy budynek jest ukończony (brak timera)
      buildings.forEach(b => { if (!b.buildTimer) { aG += (BUILDINGS[b.type].prod.gold || 0) * b.level; aE += (BUILDINGS[b.type].prod.elixir || 0) * b.level; } });
      if (aG > 0 || aE > 0) { gold += aG; elixir += aE; updateUI(); }
      prodTimer = 0;
    }
  }

  tryPlaceBuilding(p) {
    let gridX = Math.floor(p.worldX / TILE);
    let gridY = Math.floor(p.worldY / TILE);
    
    if (gridX === this.lastGridX && gridY === this.lastGridY) return;
    if (gridX < 0 || gridY < 0 || gridX >= GRID || gridY >= GRID) return;
    
    if (buildings.some(b => b.gridX === gridX && b.gridY === gridY)) return;
    
    const def = BUILDINGS[selectedBuildingType];
    if (gold < def.cost.gold) { 
      if (Date.now() > lastGoldWarningTime) { showMessage('Za mało złota!'); lastGoldWarningTime = Date.now() + 1500; }
      return; 
    }
    if (elixir < def.cost.elixir) { showMessage('Za mało Many!'); return; }

    gold -= def.cost.gold; elixir -= def.cost.elixir; addXP(10); 
    if (selectedBuildingType === 'mine') updateQuest('build_mine', 1);
    if (selectedBuildingType === 'altar') updateQuest('build_altar', 1);

    playSound('build'); this.createBuilding(gridX, gridY, selectedBuildingType, true, 1);
    this.lastGridX = gridX; this.lastGridY = gridY;
    updateUI(); saveGame();
  }

  createBuilding(gridX, gridY, type, isNew, level, hp = null, buildEndTime = 0) {
    const def = BUILDINGS[type];
    let screenX = gridX * TILE + TILE/2;
    let screenY = gridY * TILE + TILE/2;
    
    const container = drawBuildingTexture(this, screenX, screenY, def, 1);
    
    const label = this.add.text(screenX, screenY + 20, def.name + ' L' + level, { fontSize: '10px', color: '#fff', fontStyle: 'bold', backgroundColor: '#00000088', padding:{x:2,y:2} }).setOrigin(0.5);
    const buildText = this.add.text(screenX, screenY - 35, '', { fontSize: '18px', color: '#ffaa00', fontStyle: 'bold', backgroundColor: '#00000088' }).setOrigin(0.5);
    const hpBarBg = this.add.rectangle(screenX, screenY - 25, 30, 4, 0x000000);
    const hpBar = this.add.rectangle(screenX - 15, screenY - 25, 30, 4, 0x00ff00).setOrigin(0, 0.5);
    
    container.setSize(TILE, TILE).setInteractive({ useHandCursor: true });
    container.gridX = gridX; container.gridY = gridY; container.level = level;
    container.label = label; container.hpBar = hpBar; container.buildText = buildText;
    container.buildTimer = null; // Nowy system timerów
    
    // Jeśli to nowy budynek, ustawiamy czas budowy
    if (isNew) {
      let buildTimeMs = def.buildTime * level * 1000;
      container.setAlpha(0.5); 
      label.setAlpha(0.5);
      
      let remain = Math.ceil(buildTimeMs / 1000);
      buildText.setText('🔨 ' + remain + 's');

      // Używamy Phaserowego zegara zamiast systemowego
      container.buildTimer = this.time.addEvent({
        delay: 1000, 
        repeat: remain - 1,
        callback: () => {
          remain--;
          if (remain > 0) {
            buildText.setText('🔨 ' + remain + 's');
          } else {
            // KONIEC BUDOWY
            buildText.setText('');
            container.setAlpha(1);
            label.setAlpha(1);
            container.buildTimer = null;
            saveGame();
            if (currentlySelectedBuilding === container) openBuildingPanel(container);
            showMessage('Budowa ukończona!');
          }
        }
      });
    }
    
    container.hp = hp !== null ? hp : def.hp * level; 
    container.maxHp = def.hp * level; 
    container.hpBar.scaleX = container.hp / container.maxHp;

    container.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation(); if (selectedBuildingType) return; openBuildingPanel(container);
    });
    buildings.push(container); 
    if (isNew && window.preview) window.preview.setVisible(false);
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  create() {
    let cam = this.cameras.main; cam.setBackgroundColor('#1a1a1a'); cam.setScroll(0, 0); cam.setZoom(1);
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
      } else { showMessage("Brak tej jednostki!"); }
    });
  }
  
  createEnemyBuilding(gridX, gridY, hp, type, isDefense, lootG, lootE) {
    const def = BUILDINGS[type]; 
    let screenX = gridX * TILE + TILE/2;
    let screenY = gridY * TILE + TILE/2;
    let container = drawBuildingTexture(this, screenX, screenY, def, 1); 
    
    let hpBarBg = this.add.rectangle(screenX, screenY - 25, 30, 4, 0x000000);
    let hpBar = this.add.rectangle(screenX - 15, screenY - 25, 30, 4, 0x00ff00).setOrigin(0, 0.5);
    
    this.enemyBuildings.push({ container: container, sprite: container, hpBar: hpBar, hp: hp, maxHp: hp, gridX: gridX, gridY: gridY, x: screenX, y: screenY, alive: true, isDefense: isDefense, lootG: lootG, lootE: lootE, type: type });
  }
  
  spawnTroop(x, y, type) {
    const def = getTroopStats(type); let bgColor = '#4a5c38'; 
    if (type === 'hero') bgColor = '#8b0000'; 
    if (type === 'wallbreaker') bgColor = '#ff8c00'; 
    let size = (type === 'hero') ? '32px' : '20px';
    const troopSprite = this.add.text(x, y, def.short, { fontSize: size, color: '#fff', fontStyle: 'bold', backgroundColor: bgColor, padding: {x: (type==='hero'?8:4), y: (type==='hero'?8:4)} }).setOrigin(0.5);
    const hpBar = this.add.rectangle(x - 12, y - (type==='hero'?30:24), (type==='hero'?40:24), 6, 0x00ff00).setOrigin(0, 0.5);
    this.troops.push({ type: type, def: def, sprite: troopSprite, hpBar: hpBar, x: x, y: y, target: null, hp: def.hp, maxHp: def.hp });
  }
  
  showDamageText(x, y, amount) {
    let dmgText = this.add.text(x, y - 30, '-' + Math.floor(amount), { fontSize: '18px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: dmgText, y: y - 70, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });
  }
  explode(x, y, color) {
    let blast = this.add.circle(x, y, 20, color, 0.8);
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
          const laser = this.add.line(0, 0, tower.x, tower.y, nearestTroop.x, nearestTroop.y, 0xff0000);
          laser.setOrigin(0, 0); laser.setLineWidth(4); setTimeout(() => laser.destroy(), 150); 
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
      let barWidth = (troop.type === 'hero') ? 40 : 24;
      troop.hpBar.width = barWidth * (troop.hp / troop.maxHp); troop.hpBar.setPosition(troop.x - barWidth/2, troop.y - (troop.type==='hero'?30:24));
      
      if (!troop.target || !troop.target.alive) troop.target = this.findNearestBuilding(troop.x, troop.y, troop.def.target);
      
      if (troop.target) {
        const dist = Phaser.Math.Distance.Between(troop.x, troop.y, troop.target.x, troop.target.y);
        
        if (troop.type === 'wallbreaker' && dist <= troop.def.range) {
          this.explode(troop.target.x, troop.target.y, 0xff8c00); this.explode(troop.x, troop.y, 0xff0000); playSound('boom');
          troop.target.hp -= 1000;
          this.enemyBuildings.forEach(b => {
            if (b.alive && Phaser.Math.Distance.Between(troop.x, troop.y, b.x, b.y) < 80) b.hp -= 300;
          });
          troop.hp = 0; continue;
        }
        
        if (dist > troop.def.range) {
          const angle = Phaser.Math.Angle.Between(troop.x, troop.y, troop.target.x, troop.target.y);
          troop.x += Math.cos(angle) * troop.def.speed * dt; troop.y += Math.sin(angle) * troop.def.speed * dt;
          troop.sprite.setPosition(troop.x, troop.y);
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

class DefenseScene extends Phaser.Scene {
  constructor() { super('DefenseScene'); }
  create() {
    let cam = this.cameras.main; cam.setBackgroundColor('#2b3625');
    let grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2b3625, 1, 0x3e4a35, 1); grid.setOrigin(0, 0);
    for(let i=0; i<100; i++) { this.add.circle(Phaser.Math.Between(0, TILE*GRID), Phaser.Math.Between(0, TILE*GRID), Phaser.Math.Between(2, 4), 0x1a2415, 0.5); }
    this.playerBuildings = []; const saved = loadGame(); 
    saved.forEach(b => {
      const def = BUILDINGS[b.type]; 
      let screenX = b.gridX * TILE + TILE/2; let screenY = b.gridY * TILE + TILE/2;
      let container = drawBuildingTexture(this, screenX, screenY, def, 1);
      
      const label = this.add.text(screenX, screenY + 20, def.name + ' L' + b.level, { fontSize: '10px', color: '#fff', backgroundColor:'#00000088', padding:{x:2,y:2} }).setOrigin(0.5);
      const hpBarBg = this.add.rectangle(screenX, screenY - 25, 30, 4, 0x000000);
      const hpBar = this.add.rectangle(screenX - 15, screenY - 25, 30, 4, 0x00ff00).setOrigin(0, 0.5);
      this.playerBuildings.push({ sprite: container, rect: container, hpBar: hpBar, gridX: b.gridX, gridY: b.gridY, x: screenX, y: screenY, hp: b.hp, maxHp: b.maxHp, type: b.type, level: b.level, alive: true, isDefense: (b.type === 'tower'), buildEndTime: b.buildEndTime });
    });
    
    let centerX = Math.floor(GRID/2) * TILE + TILE/2;
    let centerY = Math.floor(GRID/2) * TILE + TILE/2;
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0);
    cam.scrollX = centerX - cam.width / 2; cam.scrollY = centerY - cam.height / 2;
    this.centerBase = { x: centerX, y: centerY };

    this.enemies = []; this.waveCount = 0; this.battleEnded = false; this.mortarCooldown = 0; 
    this.spawnWave();
    this.time.addEvent({ delay: 1500, loop: true, callback: () => {
        if (this.battleEnded) return;
        this.playerBuildings.forEach(tower => {
          if (tower.alive && tower.isDefense && tower.buildEndTime <= Date.now()) {
            let target = this.enemies.find(e => e.alive && Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) < 400);
            if (target) {
              const laser = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0x00ffff);
              laser.setOrigin(0, 0); laser.setLineWidth(5); setTimeout(() => laser.destroy(), 150); target.hp -= 30; playSound('shoot');
            }
          }
        });
    }});
    this.input.on('pointerdown', (pointer) => {
      if (this.battleEnded || this.mortarCooldown > 0) return;
      const clickX = pointer.worldX; const clickY = pointer.worldY;
      const blast = this.add.circle(clickX, clickY, 80, 0xffaa00, 0.6); this.time.delayedCall(200, () => blast.destroy()); playSound('boom');
      this.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const dist = Phaser.Math.Distance.Between(clickX, clickY, enemy.x, enemy.y);
        if (dist <= 80) enemy.hp -= 100;
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
      const sprite = this.add.text(x, y, '🩸', { fontSize: '20px', color: '#fff', backgroundColor: '#8b0000', padding: {x:4, y:4} }).setOrigin(0.5);
      const hpBar = this.add.rectangle(x - 12, y - 24, 24, 4, 0x00ff00).setOrigin(0, 0.5);
      this.enemies.push({ sprite, hpBar, x, y, hp: 100, maxHp: 100, target: null, alive: true, damage: 15, speed: 80 });
    }
  }
  update(time, delta) {
    if (this.battleEnded) return;
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];
      if (enemy.hp <= 0) { enemy.alive = false; enemy.sprite.destroy(); enemy.hpBar.destroy(); this.enemies.splice(i, 1); continue; }
      enemy.hpBar.width = 24 * (enemy.hp / enemy.maxHp); enemy.hpBar.setPosition(enemy.x - 12, enemy.y - 24);
      if (!enemy.target || !enemy.target.alive) {
        let nearest = null, minDist = Infinity;
        this.playerBuildings.forEach(b => { if (b.alive) { const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, b.x, b.y); if (dist < minDist) { minDist = dist; nearest = b; } } });
        enemy.target = nearest;
      }
      if (enemy.target) {
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
        if (dist > 40) {
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