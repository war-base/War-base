let cam, preview, fpsText, isDragging = false;

// --- PRZEŁĄCZANIE EKRANÓW ---
function startAttack() {
  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  game.scene.start('BattleScene');
}

function endBattle() {
  document.getElementById('build-menu').style.display = 'flex';
  document.getElementById('attack-btn').style.display = 'block';
  document.getElementById('top-bar').style.display = 'flex';
  game.scene.start('BaseScene');
}

// ==========================================
// SCENA 1: BAZA (Budowanie)
// ==========================================
class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }

  create() {
    cam = this.cameras.main;
    cam.setZoom(0.8);

    let gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x3d6b55, 1);
    for (let i = 0; i <= GRID; i++) {
      gridGraphics.lineBetween(i * TILE, 0, i * TILE, GRID * TILE);
      gridGraphics.lineBetween(0, i * TILE, GRID * TILE, i * TILE);
    }

    preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(10);
    window.preview = preview;

    fpsText = this.add.text(10, 50, 'FPS: 0', { fontSize: '14px', color: '#00ff00', backgroundColor: '#00000088', padding: {x: 10, y: 10} }).setScrollFactor(0).setDepth(20);

    buildings = []; // Reset tablicy przy starcie
    const savedBuildings = loadGame();
    savedBuildings.forEach(b => this.createBuilding(b.x, b.y, b.type, false));
    updateUI();

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
  }

  update(time, delta) {
    if (fpsText) fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));

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
    if (isNew && preview) preview.setVisible(false);
  }
}

// ==========================================
// SCENA 2: WALKA (Atak na wroga)
// ==========================================
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#3e1a1a');
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(0, 0);

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, 80, 'WROGI OBOZ', { fontSize: '36px', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY, 100, 100, 0x8b0000).setStrokeStyle(4, 0x000000);
    this.add.text(centerX, centerY, 'Wrogi\nRatusz', { fontSize: '14px', color: '#fff', align: 'center' }).setOrigin(0.5);

    this.add.rectangle(centerX - 150, centerY - 100, 60, 60, 0x555555).setStrokeStyle(2, 0x000000);
    this.add.rectangle(centerX + 150, centerY - 100, 60, 60, 0x555555).setStrokeStyle(2, 0x000000);

    this.add.rectangle(centerX - 120, centerY + 80, 50, 50, 0xffd700);
    this.add.rectangle(centerX + 120, centerY + 80, 50, 50, 0xffd700);

    const backBtn = this.add.text(centerX, this.cameras.main.height - 80, 'WRÓĆ DO BAZY', { 
      fontSize: '20px', backgroundColor: '#ffffff', color: '#000000', padding: {x: 20, y: 15}, fontStyle: 'bold' 
    }).setOrigin(0.5).setInteractive();

    backBtn.on('pointerdown', () => { endBattle(); });
  }
}

// --- URUCHOMIENIE GRY ---
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BaseScene, BattleScene]
};

const game = new Phaser.Game(config);