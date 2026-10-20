function startAttack() {
  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  
  document.getElementById('battle-ui').style.display = 'block';
  document.getElementById('ui-army').innerText = "20"; 
  
  game.scene.start('BattleScene');
}

function endBattle(won = false) {
  document.getElementById('build-menu').style.display = 'flex';
  document.getElementById('attack-btn').style.display = 'block';
  document.getElementById('top-bar').style.display = 'flex';
  document.getElementById('battle-ui').style.display = 'none';
  
  if (won) {
    gold += 500; 
    elixir += 200;
    updateUI();
    saveGame();
    showMessage("Zwycięstwo!\nZdobyto 500 🪙 i 200 💧");
  }
  
  game.scene.start('BaseScene');
}

// ==========================================
// SCENA 1: BAZA
// ==========================================
class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }

  create() {
    let cam = this.cameras.main;
    cam.setBackgroundColor('#2d4a3e');
    
    // Wymuszone malowanie dużego zielonego tła
    this.add.rectangle(0, 0, 3000, 3000, 0x2d4a3e).setOrigin(0, 0);

    let gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x3d6b55, 1);
    for (let i = 0; i <= GRID; i++) {
      gridGraphics.lineBetween(i * TILE, 0, i * TILE, GRID * TILE);
      gridGraphics.lineBetween(0, i * TILE, GRID * TILE, i * TILE);
    }

    let preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(10);
    window.preview = preview;

    this.fpsText = this.add.text(10, 50, 'FPS: 0', { fontSize: '14px', color: '#00ff00', backgroundColor: '#00000088', padding: {x: 10, y: 10} }).setScrollFactor(0).setDepth(20);

    buildings = []; 
    const savedBuildings = loadGame();
    savedBuildings.forEach(b => this.createBuilding(b.x, b.y, b.type, false));
    updateUI();

    let isDragging = false;

    this.input.on('pointermove', (p) => {
      if (p.isDown) {
        isDragging = true;
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });

    this.input.on('pointerup', (p) => {
      const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY);
      if (dist < 15 && selectedBuildingType) {
        this.tryPlaceBuilding(p);
      }
      isDragging = false;
      if (preview) preview.setVisible(false);
    });

    this.input.on('pointerdown', (p) => {
      if (selectedBuildingType) {
        preview.setFillStyle(BUILDINGS[selectedBuildingType].color, 0.6);
        preview.setPosition(this.snap(p.worldX), this.snap(p.worldY)).setVisible(true);
      }
    });

    cam.setBounds(0, 0, TILE * GRID, TILE * GRID);
    cam.centerOn(TILE * GRID / 2, TILE * GRID / 2);
    cam.setZoom(0.8);
  }

  update(time, delta) {
    if (this.fpsText) this.fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));

    prodTimer += delta;
    if (prodTimer >= 1000) {
      let addedGold = 0, addedElixir = 0;
      buildings.forEach(b => {
        addedGold += BUILDINGS[b.type].prod.gold;
        addedElixir += BUILDINGS[b.type].prod.elixir;
      });
      if (addedGold > 0 || addedElixir > 0) {
        gold += addedGold; elixir += addedElixir; updateUI();
      }
      prodTimer = 0;
    }
  }

  snap(v) { return Math.floor(v / TILE) * TILE + TILE / 2; }

  tryPlaceBuilding(p) {
    const def = BUILDINGS[selectedBuildingType];
    const x = this.snap(p.worldX);
    const y = this.snap(p.worldY);

    if (x < TILE / 2 || y < TILE / 2 || x > (GRID - 0.5) * TILE || y > (GRID - 0.5) * TILE) return;
    if (buildings.some(b => b.gridX === x && b.gridY === y)) return;

    if (gold < def.cost.gold) { showMessage('Za mało złota!'); return; }
    if (elixir < def.cost.elixir) { showMessage('Za mało eliksiru!'); return; }

    gold -= def.cost.gold; elixir -= def.cost.elixir;
    this.createBuilding(x, y, selectedBuildingType, true);
    updateUI(); saveGame();
  }

  createBuilding(x, y, type, isNew) {
    const def = BUILDINGS[type];
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, TILE - 6, TILE - 6, def.color).setStrokeStyle(2, def.stroke);
    const label = this.add.text(0, 0, def.name, { fontSize: '10px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    
    container.add([rect, label]);
    container.setSize(TILE, TILE).setInteractive({ useHandCursor: true });
    container.type = type; container.gridX = x; container.gridY = y;

    container.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      if (selectedBuildingType) return; 
      
      gold += Math.floor(def.cost.gold * 0.5);
      elixir += Math.floor(def.cost.elixir * 0.5);
      updateUI();
      
      container.destroy();
      buildings = buildings.filter(b => b !== container);
      saveGame();
    });

    buildings.push(container);
    if (isNew && window.preview) window.preview.setVisible(false);
  }
}

// ==========================================
// SCENA 2: WALKA
// ==========================================
class BattleScene extends Phaser.Scene {
  constructor() { 
    super('BattleScene'); 
    this.enemyBuildings = [];
    this.troops = [];
    this.armyLeft = 20;
    this.battleEnded = false;
  }

  create() {
    let cam = this.cameras.main;
    cam.setBackgroundColor('#3e1a1a');
    
    // Wymuszone malowanie dużego czerwonego tła
    this.add.rectangle(0, 0, 3000, 3000, 0x3e1a1a).setOrigin(0, 0);

    // Pobieramy szerokość i wysokość z kamery, a nie z this.scale (co powodowało błąd!)
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.enemyBuildings = [];
    this.troops = [];
    this.armyLeft = 20;
    this.battleEnded = false;

    this.createEnemyBuilding(cx, cy, 200, 0x8b0000); 
    this.createEnemyBuilding(cx - 120, cy - 100, 100, 0xffd700); 
    this.createEnemyBuilding(cx + 120, cy - 100, 100, 0xffd700); 
    this.createEnemyBuilding(cx, cy + 120, 150, 0x555555); 

    this.input.on('pointerdown', (pointer) => {
      if (this.armyLeft > 0 && !this.battleEnded) {
        this.spawnTroop(pointer.x, pointer.y);
        this.armyLeft--;
        document.getElementById('ui-army').innerText = this.armyLeft;
      }
    });
  }

  createEnemyBuilding(x, y, hp, color) {
    const size = 60;
    const rect = this.add.rectangle(x, y, size, size, color).setStrokeStyle(2, 0x000000);
    const hpBarBg = this.add.rectangle(x, y - 40, size, 8, 0x000000);
    const hpBar = this.add.rectangle(x - size/2, y - 40, size, 8, 0x00ff00).setOrigin(0, 0.5);

    this.enemyBuildings.push({
      sprite: rect, hpBar: hpBar, hp: hp, maxHp: hp, x: x, y: y, alive: true
    });
  }

  spawnTroop(x, y) {
    const troopSprite = this.add.circle(x, y, 12, 0x1e90ff).setStrokeStyle(2, 0xffffff);
    this.troops.push({ sprite: troopSprite, x: x, y: y, target: null });
  }

  update(time, delta) {
    if (this.battleEnded) return;
    const dt = delta / 1000; 

    this.troops.forEach(troop => {
      if (!troop.target || !troop.target.alive) {
        troop.target = this.findNearestBuilding(troop.x, troop.y);
      }

      if (troop.target) {
        const dist = Phaser.Math.Distance.Between(troop.x, troop.y, troop.target.x, troop.target.y);
        
        if (dist > TROOP_STATS.range) {
          const angle = Phaser.Math.Angle.Between(troop.x, troop.y, troop.target.x, troop.target.y);
          troop.x += Math.cos(angle) * TROOP_STATS.speed * dt;
          troop.y += Math.sin(angle) * TROOP_STATS.speed * dt;
          troop.sprite.setPosition(troop.x, troop.y);
        } else {
          troop.target.hp -= TROOP_STATS.damage * dt;
          const hpPercent = Math.max(0, troop.target.hp / troop.target.maxHp);
          troop.target.hpBar.scaleX = hpPercent;

          if (troop.target.hp <= 0) {
            troop.target.alive = false;
            troop.target.sprite.destroy();
            troop.target.hpBar.destroy();
            troop.target = null; 
          }
        }
      }
    });

    const aliveBuildings = this.enemyBuildings.filter(b => b.alive);
    if (aliveBuildings.length === 0) {
      this.battleEnded = true;
      setTimeout(() => endBattle(true), 1000);
    }
  }

  findNearestBuilding(x, y) {
    let nearest = null;
    let minDist = Infinity;
    this.enemyBuildings.forEach(b => {
      if (b.alive) {
        const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
        if (dist < minDist) { minDist = dist; nearest = b; }
      }
    });
    return nearest;
  }
}

// --- URUCHOMIENIE GRY ---
const config = {
  type: Phaser.CANVAS, 
  parent: 'game',
  backgroundColor: '#2d4a3e',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BaseScene, BattleScene]
};

const game = new Phaser.Game(config);