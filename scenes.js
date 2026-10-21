class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }
  create() {
    baseSceneInstance = this; 
    let cam = this.cameras.main;
    cam.setBackgroundColor('#2b3625');

    // Rysowanie siatki
    let graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3e4a35, 0.5);
    for (let i = 0; i <= GRID; i++) {
        graphics.lineBetween(i * TILE, 0, i * TILE, GRID * TILE);
        graphics.lineBetween(0, i * TILE, GRID * TILE, i * TILE);
    }

    buildings = []; 
    try { loadGame().forEach(b => this.createBuilding(b.gridX, b.gridY, b.type, false, b.level || 1)); } catch (e) {}
    updateUI(); updateSoundButton(); updateDailyButtonState();

    this.lastGridX = -1; this.lastGridY = -1;
    
    this.input.on('pointerdown', (p) => {
      this.lastGridX = -1; this.lastGridY = -1;
      if (selectedBuildingType === 'wall') this.tryPlaceBuilding(p);
    });
    
    this.input.on('pointermove', (p) => {
      if (selectedBuildingType) {
        let gridX = Math.floor(p.worldX / TILE);
        let gridY = Math.floor(p.worldY / TILE);
        if (window.preview) { window.preview.setPosition(gridX * TILE + TILE/2, gridY * TILE + TILE/2).setVisible(true); }
        if (selectedBuildingType === 'wall' && p.isDown) this.tryPlaceBuilding(p);
      } else if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x); 
        cam.scrollY -= (p.y - p.prevPosition.y);
      }
    });
    
    this.input.on('pointerup', (p) => { 
        if (selectedBuildingType && selectedBuildingType !== 'wall') this.tryPlaceBuilding(p); 
        if (window.preview) window.preview.setVisible(false); 
    });
    
    window.preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(100);
    
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0); centerCamera(); 
  }

  update(time, delta) {
    prodTimer += delta;
    if (prodTimer >= 1000) {
      let aG = 0, aE = 0;
      buildings.forEach(b => { aG += (BUILDINGS[b.type].prod.gold || 0) * b.level; aE += (BUILDINGS[b.type].prod.elixir || 0) * b.level; });
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
    if (gold < def.cost.gold) { showMessage('Za mało złota!'); return; }
    if (elixir < def.cost.elixir) { showMessage('Za mało Many!'); return; }

    gold -= def.cost.gold; elixir -= def.cost.elixir; addXP(10); 
    if (selectedBuildingType === 'mine') updateQuest('build_mine', 1);
    if (selectedBuildingType === 'altar') updateQuest('build_altar', 1);

    playSound('build'); this.createBuilding(gridX, gridY, selectedBuildingType, true, 1);
    this.lastGridX = gridX; this.lastGridY = gridY;
    updateUI(); saveGame();
  }

  createBuilding(gridX, gridY, type, isNew, level) {
    const def = BUILDINGS[type];
    let screenX = gridX * TILE + TILE/2;
    let screenY = gridY * TILE + TILE/2;
    
    // Prosty, płaski kwadrat jako baza
    let rect = this.add.rectangle(screenX, screenY, TILE - 4, TILE - 4, def.color).setStrokeStyle(2, 0x000000).setDepth(10);
    
    // Napis na środku
    let label = this.add.text(screenX, screenY, def.short, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);

    rect.setInteractive({ useHandCursor: true });
    rect.gridX = gridX; rect.gridY = gridY; rect.level = level;
    rect.label = label;
    
    rect.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation(); if (selectedBuildingType) return; openBuildingPanel(rect);
    });
    buildings.push(rect); 
  }
}