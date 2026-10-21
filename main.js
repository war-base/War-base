class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }
  create() {
    baseSceneInstance = this; 
    var cam = this.cameras.main;
    var grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2d4a3e, 1, 0x5a8a6e, 1);
    grid.setOrigin(0, 0);
    
    window.preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(10);
    this.fpsText = this.add.text(10, 50, 'FPS: 0', { fontSize: '14px', color: '#00ff00', backgroundColor: '#00000088', padding: {x: 10, y: 10} }).setScrollFactor(0).setDepth(20);

    buildings = []; 
    try { loadGame().forEach(function(b){ this.createBuilding(b.x, b.y, b.type, false, b.level || 1, b.hp || null, b.buildEndTime || 0); }, this); } catch (e) {}
    updateUI();

    this.lastGridX = -1; this.lastGridY = -1;
    this.input.on('pointerdown', function(p) { this.lastGridX = -1; this.lastGridY = -1; if (selectedBuildingType === 'wall') this.tryPlaceBuilding(p); }, this);
    this.input.on('pointermove', function(p) {
      if (selectedBuildingType) {
        if (window.preview) { window.preview.setFillStyle(BUILDINGS[selectedBuildingType].color, 0.6); window.preview.setPosition(this.snap(p.worldX), this.snap(p.worldY)).setVisible(true); }
        if (selectedBuildingType === 'wall' && p.isDown) this.tryPlaceBuilding(p);
      } else if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom; cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    }, this);
    this.input.on('pointerup', function(p) { if (selectedBuildingType && selectedBuildingType !== 'wall') this.tryPlaceBuilding(p); if (window.preview) window.preview.setVisible(false); }, this);
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0); centerCamera(); 
  }

  update(time, delta) {
    if (this.fpsText) this.fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));
    var now = Date.now();
    buildings.forEach(function(b) {
      if (b.buildEndTime > now) { b.buildText.setText('🔨 ' + Math.ceil((b.buildEndTime - now) / 1000) + 's'); } 
      else if (b.buildEndTime > 0) {
        b.buildEndTime = 0; b.buildText.setText(''); b.rect.setAlpha(1); b.icon.setAlpha(1); b.label.setAlpha(1);
        saveGame(); if (currentlySelectedBuilding === b) openBuildingPanel(b);
      }
    });
    prodTimer += delta;
    if (prodTimer >= 1000) {
      var aG = 0, aE = 0;
      buildings.forEach(function(b) { if (b.buildEndTime <= now) { aG += (BUILDINGS[b.type].prod.gold || 0) * b.level; aE += (BUILDINGS[b.type].prod.elixir || 0) * b.level; } });
      if (aG > 0 || aE > 0) { gold += aG; elixir += aE; updateUI(); }
      prodTimer = 0;
    }
  }

  snap(v) { return Math.floor(v / TILE) * TILE + TILE / 2; }

  tryPlaceBuilding(p) {
    var def = BUILDINGS[selectedBuildingType];
    var x = this.snap(p.worldX); var y = this.snap(p.worldY);
    if (x === this.lastGridX && y === this.lastGridY) return;
    if (x < TILE / 2 || y < TILE / 2 || x > (GRID - 0.5) * TILE || y > (GRID - 0.5) * TILE) return;
    if (buildings.some(function(b){ return b.gridX === x && b.gridY === y; })) return;
    
    if (gold < def.cost.gold) { 
      if (Date.now() > lastGoldWarningTime) { showMessage('Za mało złota!'); lastGoldWarningTime = Date.now() + 1500; }
      return; 
    }
    if (elixir < def.cost.elixir) { showMessage('Za mało eliksiru!'); return; }

    gold -= def.cost.gold; elixir -= def.cost.elixir;
    playSound('build'); this.createBuilding(x, y, selectedBuildingType, true, 1);
    this.lastGridX = x; this.lastGridY = y;
    updateUI(); saveGame();
  }

  createBuilding(x, y, type, isNew, level, hp, buildEndTime) {
    var def = BUILDINGS[type];
    var container = this.add.container(x, y);
    var rect = this.add.rectangle(0, 0, TILE - 4, TILE - 4, def.color).setStrokeStyle(2, def.stroke);
    
    // ZAMIAST EMOJI, UŻYWAMY KRÓTKIEGO TEKSTU (np. 'R', 'K')
    var icon = this.add.text(0, -5, def.short, { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    var label = this.add.text(0, 20, def.name + ' L' + level, { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    
    var buildText = this.add.text(0, -35, '', { fontSize: '18px', color: '#ffaa00', fontStyle: 'bold', backgroundColor: '#00000088' }).setOrigin(0.5);
    var hpBarBg = this.add.rectangle(0, -TILE/2 + 6, TILE - 8, 8, 0x000000);
    var hpBar = this.add.rectangle(-(TILE - 8)/2, -TILE/2 + 6, TILE - 8, 8, 0x00ff00).setOrigin(0, 0.5);
    
    container.add([rect, icon, label, hpBarBg, hpBar, buildText]);
    container.setSize(TILE, TILE).setInteractive({ useHandCursor: true });
    container.type = type; container.gridX = x; container.gridY = y; container.level = level;
    container.label = label; container.hpBar = hpBar; container.rect = rect; container.icon = icon; container.buildText = buildText;
    container.buildEndTime = isNew ? Date.now() + (def.buildTime * level * 1000) : buildEndTime;
    
    if (container.buildEndTime > Date.now()) { rect.setAlpha(0.5); icon.setAlpha(0.5); label.setAlpha(0.5); }
    container.hp = hp !== null ? hp : def.hp * level; container.maxHp = def.hp * level; container.hpBar.scaleX = container.hp / container.maxHp;

    container.on('pointerdown', function(pointer, localX, localY, event) {
      if (event) event.stopPropagation(); if (selectedBuildingType) return; openBuildingPanel(container);
    });
    buildings.push(container); if (isNew && window.preview) window.preview.setVisible(false);
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  create() {
    var cam = this.cameras.main;
    cam.setBackgroundColor('#3e1a1a'); cam.setScroll(0, 0); cam.setZoom(1);
    this.enemyBuildings = []; this.troops = []; this.battleEnded = false;
    this.lootGold = 0; this.lootElixir = 0; this.lastDamageText = 0;
    
    this.battleTime = 180; 
    this.time.addEvent({
      delay: 1000, loop: true, callback: function() {
        if (this.battleEnded) return;
        this.battleTime--;
        var m = Math.floor(this.battleTime / 60);
        var s = this.battleTime % 60;
        document.getElementById('timer-display').innerText = m + ':' + (s < 10 ? '0' : '') + s;
        if (this.battleTime <= 0) {
          this.battleEnded = true;
          setTimeout(function(){ endBattle(false, this.lootGold, this.lootElixir); }.bind(this), 1000); 
        }
      }, callbackScope: this
    });

    document.getElementById('loot-display').innerText = '0 🪙, 0 💧';
    var cx = window.innerWidth / 2; var cy = window.innerHeight / 2;

    this.createEnemyBuilding(cx, cy, 400, 0x8b0000, 'Ratusz', 'R', false, 200, 100); 

    var numBuildings = Phaser.Math.Between(6, 9);
    for(var i = 0; i < numBuildings; i++) {
        var ex, ey, valid, attempts = 0;
        do {
            var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            var dist = Phaser.Math.Between(120, 220);
            ex = cx + Math.cos(angle) * dist; ey = cy + Math.sin(angle) * dist;
            valid = true;
            for (var j = 0; j < this.enemyBuildings.length; j++) { 
              if (Phaser.Math.Distance.Between(ex, ey, this.enemyBuildings[j].x, this.enemyBuildings[j].y) < 80) { valid = false; break; } 
            }
            attempts++;
        } while(!valid && attempts < 20);
        
        if (valid) {
            var typeRnd = Phaser.Math.Between(1, 10);
            if (typeRnd <= 3) this.createEnemyBuilding(ex, ey, 150, 0x555555, 'Wieża', 'W', true, 0, 0);
            else if (typeRnd <= 6) this.createEnemyBuilding(ex, ey, 100, 0xffd700, 'Kopalnia', 'K', false, 300, 0);
            else if (typeRnd <= 8) this.createEnemyBuilding(ex, ey, 150, 0x8b0000, 'Koszary', 'Ko', false, 0, 200);
            else this.createEnemyBuilding(ex, ey, 250, 0x808080, 'Mur', 'M', false, 0, 0);
        }
    }

    this.time.addEvent({ delay: 1500, loop: true, callback: this.towersShoot, callbackScope: this });

    this.input.on('pointerdown', function(pointer) {
      if (this.battleEnded) return;
      if (army[selectedBattleTroopType] > 0) {
        this.spawnTroop(pointer.x, pointer.y, selectedBattleTroopType);
        army[selectedBattleTroopType]--; updateUI(); playSound('shoot');
      } else { showMessage("Brak tej jednostki!"); }
    });
  }

  createEnemyBuilding(x, y, hp, color, name, short, isDefense, lootG, lootE) {
    var size = 60;
    var rect = this.add.rectangle(x, y, size, size, color).setStrokeStyle(2, 0x000000);
    this.add.text(x, y - 5, short, {fontSize: '24px', color: '#fff', fontStyle: 'bold'}).setOrigin(0.5);
    this.add.text(x, y + 20, name, {fontSize: '11px', color: '#fff'}).setOrigin(0.5);
    this.add.rectangle(x, y - 40, size, 8, 0x000000);
    var hpBar = this.add.rectangle(x - size/2, y - 40, size, 8, 0x00ff00).setOrigin(0, 0.5);
    this.enemyBuildings.push({ sprite: rect, hpBar: hpBar, hp: hp, maxHp: hp, x: x, y: y, alive: true, isDefense: isDefense, lootG: lootG, lootE: lootE });
  }

  spawnTroop(x, y, type) {
    var def = getTroopStats(type); 
    var troopSprite = this.add.text(x, y, def.short, { fontSize: '20px', color: '#fff', fontStyle: 'bold', backgroundColor: '#1e90ff', padding: {x:4, y:4} }).setOrigin(0.5);
    var hpBar = this.add.rectangle(x - 12, y - 24, 24, 4, 0x00ff00).setOrigin(0, 0.5);
    this.troops.push({ type: type, def: def, sprite: troopSprite, hpBar: hpBar, x: x, y: y, target: null, hp: def.hp, maxHp: def.hp });
  }

  showDamageText(x, y, amount) {
    var dmgText = this.add.text(x, y - 30, '-' + Math.floor(amount), { fontSize: '18px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: dmgText, y: y - 70, alpha: 0, duration: 800, onComplete: function(){ dmgText.destroy(); } });
  }

  explode(x, y, color) {
    var blast = this.add.circle(x, y, 20, color, 0.8);
    this.tweens.add({ targets: blast, scale: 3, alpha: 0, duration: 400, onComplete: function(){ blast.destroy(); } });
  }

  towersShoot() {
    if (this.battleEnded) return;
    this.enemyBuildings.forEach(function(tower) {
      if (tower.alive && tower.isDefense) {
        var nearestTroop = null; var minDist = 300; 
        this.troops.forEach(function(troop) {
          var dist = Phaser.Math.Distance.Between(tower.x, tower.y, troop.x, troop.y);
          if (dist < minDist) { minDist = dist; nearestTroop = troop; }
        });
        if (nearestTroop) {
          var laser = this.add.line(0, 0, tower.x, tower.y, nearestTroop.x, nearestTroop.y, 0xff0000);
          laser.setOrigin(0, 0); laser.setLineWidth(4); setTimeout(function(){ laser.destroy(); }, 150); 
          nearestTroop.hp -= 25; this.showDamageText(nearestTroop.x, nearestTroop.y, 25); playSound('shoot');
        }
      }
    }, this);
  }

  update(time, delta) {
    if (this.battleEnded) return;
    var dt = delta / 1000; 

    for (var i = this.troops.length - 1; i >= 0; i--) {
      var troop = this.troops[i];
      if (troop.hp <= 0) { troop.sprite.destroy(); troop.hpBar.destroy(); this.troops.splice(i, 1); continue; }
      troop.hpBar.width = 24 * (troop.hp / troop.maxHp); troop.hpBar.setPosition(troop.x - 12, troop.y - 24);

      if (!troop.target || !troop.target.alive) troop.target = this.findNearestBuilding(troop.x, troop.y, troop.def.target);
      
      if (troop.target) {
        var dist = Phaser.Math.Distance.Between(troop.x, troop.y, troop.target.x, troop.target.y);
        if (dist > troop.def.range) {
          var angle = Phaser.Math.Angle.Between(troop.x, troop.y, troop.target.x, troop.target.y);
          troop.x += Math.cos(angle) * troop.def.speed * dt; troop.y += Math.sin(angle) * troop.def.speed * dt;
          troop.sprite.setPosition(troop.x, troop.y);
        } else {
          var dmg = troop.def.damage * dt; 
          troop.target.hp -= dmg; troop.target.hpBar.scaleX = Math.max(0, troop.target.hp / troop.target.maxHp);
          
          if (time > this.lastDamageText + 200) { this.showDamageText(troop.target.x + Phaser.Math.Between(-20, 20), troop.target.y, dmg * 5); this.lastDamageText = time; }
          if (troop.type === 'archer' && Math.random() < 0.1) {
            var arrow = this.add.line(0, 0, troop.x, troop.y, troop.target.x, troop.target.y, 0xffffff);
            arrow.setOrigin(0,0); setTimeout(function(){ arrow.destroy(); }, 100); playSound('shoot');
          }
          if (troop.target.hp <= 0) {
            troop.target.alive = false; this.explode(troop.target.x, troop.target.y, 0xffaa00); playSound('boom');
            troop.target.sprite.destroy(); troop.target.hpBar.destroy(); 
            if (troop.target.lootG > 0 || troop.target.lootE > 0) {
              this.lootGold += troop.target.lootG; this.lootElixir += troop.target.lootE;
              document.getElementById('loot-display').innerText = this.lootGold + ' 🪙, ' + this.lootElixir + ' 💧';
              this.showDamageText(troop.target.x, troop.target.y, '+' + troop.target.lootG + ' 🪙'); playSound('coin');
            }
            troop.target = null; 
          }
        }
      }
    }

    if (this.enemyBuildings.filter(function(b){ return b.alive; }).length === 0) {
      this.battleEnded = true; setTimeout(function(){ endBattle(true, this.lootGold, this.lootElixir); }.bind(this), 1000);
    } else if (army.barbarian + army.archer + army.giant === 0 && this.troops.length === 0 && !this.battleEnded) {
      this.battleEnded = true; setTimeout(function(){ endBattle(false, this.lootGold, this.lootElixir); }.bind(this), 1000);
    }
  }

  findNearestBuilding(x, y, targetType) {
    var nearest = null, minDist = Infinity;
    this.enemyBuildings.forEach(function(b) {
      if (b.alive) {
        var hasDefenses = this.enemyBuildings.some(function(eb){ return eb.alive && eb.isDefense; });
        if (targetType === 'defense' && hasDefenses && !b.isDefense) return;
        var dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
        if (dist < minDist) { minDist = dist; nearest = b; }
      }
    }, this);
    return nearest;
  }
}

class DefenseScene extends Phaser.Scene {
  constructor() { super('DefenseScene'); }
  create() {
    var cam = this.cameras.main;
    cam.setBackgroundColor('#2d4a3e');
    var grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2d4a3e, 1, 0x5a8a6e, 1);
    grid.setOrigin(0, 0);
    this.playerBuildings = [];
    var saved = loadGame(); 
    saved.forEach(function(b) {
      var def = BUILDINGS[b.type];
      var container = this.add.container(b.x, b.y);
      var rect = this.add.rectangle(0, 0, TILE - 4, TILE - 4, def.color).setStrokeStyle(2, def.stroke);
      var icon = this.add.text(0, -5, def.short, { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      var label = this.add.text(0, 20, def.name + ' L' + b.level, { fontSize: '11px', color: '#fff' }).setOrigin(0.5);
      var hpBarBg = this.add.rectangle(0, -TILE/2 + 6, TILE - 8, 8, 0x000000);
      var hpBar = this.add.rectangle(-(TILE - 8)/2, -TILE/2 + 6, TILE - 8, 8, 0x00ff00).setOrigin(0, 0.5);
      container.add([rect, icon, label, hpBarBg, hpBar]);
      this.playerBuildings.push({ sprite: container, rect: rect, hpBar: hpBar, x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, type: b.type, level: b.level, alive: true, isDefense: (b.type === 'tower'), buildEndTime: b.buildEndTime });
    }, this);
    
    var townhall = this.playerBuildings.find(function(b){ return b.type === 'townhall'; });
    var centerX = townhall ? townhall.x : (this.playerBuildings.length > 0 ? this.playerBuildings[0].x : TILE * GRID / 2);
    var centerY = townhall ? townhall.y : (this.playerBuildings.length > 0 ? this.playerBuildings[0].y : TILE * GRID / 2);
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0);
    cam.scrollX = centerX - cam.width / 2 / cam.zoom; cam.scrollY = centerY - cam.height / 2 / cam.zoom;
    this.centerBase = { x: centerX, y: centerY };

    this.enemies = []; this.waveCount = 0; this.battleEnded = false; this.mortarCooldown = 0; 
    this.spawnWave();
    
    this.time.addEvent({
      delay: 1500, loop: true, callback: function() {
        if (this.battleEnded) return;
        this.playerBuildings.forEach(function(tower) {
          if (tower.alive && tower.isDefense && tower.buildEndTime <= Date.now()) {
            var target = this.enemies.find(function(e){ return e.alive && Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y) < 400; });
            if (target) {
              var laser = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0x00ffff);
              laser.setOrigin(0, 0); laser.setLineWidth(5); setTimeout(function(){ laser.destroy(); }, 150); target.hp -= 30; playSound('shoot');
            }
          }
        }, this);
      }, callbackScope: this
    });

    this.input.on('pointerdown', function(pointer) {
      if (this.battleEnded || this.mortarCooldown > 0) return;
      var clickX = pointer.worldX; var clickY = pointer.worldY;
      var blast = this.add.circle(clickX, clickY, 80, 0xffaa00, 0.6);
      this.time.delayedCall(200, function(){ blast.destroy(); }); playSound('boom');
      this.enemies.forEach(function(enemy) {
        if (!enemy.alive) return;
        var dist = Phaser.Math.Distance.Between(clickX, clickY, enemy.x, enemy.y);
        if (dist <= 80) enemy.hp -= 100;
      });
      this.mortarCooldown = 3000; document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: 3s)';
      this.time.addEvent({
        delay: 1000, repeat: 2, callback: function() {
          if (this.battleEnded) return;
          this.mortarCooldown -= 1000;
          if (this.mortarCooldown <= 0) document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: Gotowy)';
          else document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: ' + (this.mortarCooldown/1000) + 's)';
        }, callbackScope: this
      });
    }, this);
    
    this.time.addEvent({ delay: 10000, loop: true, callback: function() { if (!this.battleEnded) this.spawnWave(); }, callbackScope: this });
  }
  
  spawnWave() {
    this.waveCount++;
    var numEnemies = 2 + this.waveCount * 2; 
    for (var i = 0; i < numEnemies; i++) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2); var distance = Phaser.Math.Between(400, 600); 
      var x = this.centerBase.x + Math.cos(angle) * distance; var y = this.centerBase.y + Math.sin(angle) * distance;
      var sprite = this.add.text(x, y, 'W', { fontSize: '20px', color: '#fff', backgroundColor: '#ff0000', padding: {x:4, y:4} }).setOrigin(0.5);
      var hpBar = this.add.rectangle(x - 12, y - 24, 24, 4, 0x00ff00).setOrigin(0, 0.5);
      this.enemies.push({ sprite: sprite, hpBar: hpBar, x: x, y: y, hp: 100, maxHp: 100, target: null, alive: true, damage: 15, speed: 80 });
    }
  }
  
  update(time, delta) {
    if (this.battleEnded) return;
    var dt = delta / 1000;
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var enemy = this.enemies[i];
      if (enemy.hp <= 0) { enemy.alive = false; enemy.sprite.destroy(); enemy.hpBar.destroy(); this.enemies.splice(i, 1); continue; }
      enemy.hpBar.width = 24 * (enemy.hp / enemy.maxHp); enemy.hpBar.setPosition(enemy.x - 12, enemy.y - 24);
      
      if (!enemy.target || !enemy.target.alive) {
        var nearest = null, minDist = Infinity;
        this.playerBuildings.forEach(function(b) { if (b.alive) { var dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, b.x, b.y); if (dist < minDist) { minDist = dist; nearest = b; } } });
        enemy.target = nearest;
      }
      if (enemy.target) {
        var dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
        if (dist > 40) {
          var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, enemy.target.x, enemy.target.y);
          enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt; enemy.sprite.setPosition(enemy.x, enemy.y);
        } else {
          enemy.target.hp -= enemy.damage * dt; enemy.target.hpBar.scaleX = Math.max(0, enemy.target.hp / enemy.target.maxHp);
          if (enemy.target.hp <= 0) { enemy.target.alive = false; enemy.target.sprite.destroy(); enemy.target = null; playSound('boom'); }
        }
      }
    }
    
    var alivePlayerBuildings = this.playerBuildings.filter(function(b){ return b.alive; });
    if (alivePlayerBuildings.length === 0) { this.battleEnded = true; setTimeout(function(){ endDefense(false); }, 1000); } 
    else if (this.waveCount >= 3 && this.enemies.length === 0) { this.battleEnded = true; setTimeout(function(){ endDefense(true); }, 1000); }
  }
}

// --- URUCHOMIENIE GRY ---
var config = {
  type: Phaser.CANVAS, 
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d4a3e',
  render: { clearBeforeRender: false },
  scene: [BaseScene, BattleScene, DefenseScene]
};
var game = new Phaser.Game(config);