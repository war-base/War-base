const TILE = 64; 
const GRID = 25; 

let gold = 3000; // Zwiększone na start, żeby przetestować Ołtarz
let elixir = 1000;

let army = { barbarian: 5, archer: 3, giant: 1, hero: 0 }; 
let troopLevels = { barbarian: 1, archer: 1, giant: 1 }; 
let selectedBattleTroopType = 'barbarian';

const BUILDINGS = {
  townhall: { name: 'Ratusz', short: 'R', cost: { gold: 1000, elixir: 0 }, color: 0x8b4513, stroke: 0x5a2d0c, prod: { gold: 0, elixir: 0 }, hp: 1000, buildTime: 60 },
  mine: { name: 'Kopalnia', short: 'K', cost: { gold: 0, elixir: 150 }, color: 0xffd700, stroke: 0xb8860b, prod: { gold: 10, elixir: 0 }, hp: 400, buildTime: 15 },
  barracks: { name: 'Koszary', short: 'Ko', cost: { gold: 0, elixir: 150 }, color: 0x8b0000, stroke: 0x4a0000, prod: { gold: 0, elixir: 5 }, hp: 600, buildTime: 20 },
  camp: { name: 'Obóz', short: 'O', cost: { gold: 0, elixir: 250 }, color: 0x228b22, stroke: 0x006400, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 30 },
  lab: { name: 'Laboratorium', short: 'L', cost: { gold: 0, elixir: 500 }, color: 0x8a2be2, stroke: 0x4b0082, prod: { gold: 0, elixir: 0 }, hp: 800, buildTime: 40 },
  altar: { name: 'Ołtarz', short: 'B', cost: { gold: 2000, elixir: 0 }, color: 0xff8c00, stroke: 0x8b4500, prod: { gold: 0, elixir: 0 }, hp: 1200, buildTime: 50 },
  wall: { name: 'Mur', short: 'M', cost: { gold: 50, elixir: 0 }, color: 0x808080, stroke: 0x404040, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 5 },
  tower: { name: 'Wieża', short: 'W', cost: { gold: 300, elixir: 0 }, color: 0x555555, stroke: 0x000000, prod: { gold: 0, elixir: 0 }, hp: 600, buildTime: 30 }
};

const BASE_TROOPS = {
  barbarian: { name: 'Barbarzyńca', short: 'B', hp: 60, damage: 15, speed: 150, range: 40, cost: 50, target: 'any' },
  archer: { name: 'Łucznik', short: 'Ł', hp: 40, damage: 10, speed: 130, range: 180, cost: 75, target: 'any' },
  giant: { name: 'Gigant', short: 'G', hp: 400, damage: 25, speed: 60, range: 40, cost: 150, target: 'defense' },
  // Potężny Król
  hero: { name: 'Król', short: '👑', hp: 1500, damage: 80, speed: 120, range: 50, cost: 0, target: 'any' } 
};

let selectedBuildingType = null;
let buildings = [];
let prodTimer = 0;
let currentlySelectedBuilding = null;
let baseSceneInstance = null; 
let isEndingBattle = false;
let lastGoldWarningTime = 0; 
let messageTimeout = null;
let audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'build') {
      osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'shoot') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'boom') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'coin') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.setValueAtTime(1600, audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch(e) {}
}

function getTroopStats(type) {
  const base = BASE_TROOPS[type];
  let lvl = troopLevels[type] || 1;
  let multiplier = 1 + (lvl - 1) * 0.3;
  if (type === 'hero') multiplier = 1; // Król nie ma poziomów w laboratorium
  
  return {
    name: base.name, short: base.short, speed: base.speed, range: base.range, cost: base.cost, target: base.target,
    hp: Math.floor(base.hp * multiplier),
    damage: Math.floor(base.damage * multiplier)
  };
}

function showMessage(text) {
  const msg = document.getElementById('message');
  if(!msg) return;
  msg.innerText = text; msg.style.display = 'block';
  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

function getMaxArmy() {
  let max = 10; 
  buildings.forEach(b => { if (b.type === 'camp') max += 10 * b.level; });
  return max;
}
function getCurrentArmySize() { return army.barbarian + army.archer + army.giant; } // Król nie zajmuje miejsca w armii

function updateUI() {
  document.getElementById('ui-gold').innerText = Math.floor(gold);
  document.getElementById('ui-elixir').innerText = Math.floor(elixir);
  const btns = document.querySelectorAll('.build-btn');
  if (btns.length >= 8) {
    btns.forEach(btn => btn.classList.remove('selected'));
    if (selectedBuildingType === 'townhall') btns[0].classList.add('selected');
    if (selectedBuildingType === 'mine') btns[1].classList.add('selected');
    if (selectedBuildingType === 'barracks') btns[2].classList.add('selected');
    if (selectedBuildingType === 'camp') btns[3].classList.add('selected');
    if (selectedBuildingType === 'lab') btns[4].classList.add('selected');
    if (selectedBuildingType === 'altar') btns[5].classList.add('selected');
    if (selectedBuildingType === 'wall') btns[6].classList.add('selected');
    if (selectedBuildingType === 'tower') btns[7].classList.add('selected');
  }
  
  if(document.getElementById('ui-barbarian')) document.getElementById('ui-barbarian').innerText = army.barbarian;
  if(document.getElementById('ui-archer')) document.getElementById('ui-archer').innerText = army.archer;
  if(document.getElementById('ui-giant')) document.getElementById('ui-giant').innerText = army.giant;
  
  if(document.getElementById('bp-army-capacity')) {
    document.getElementById('bp-army-capacity').innerText = `${getCurrentArmySize()} / ${getMaxArmy()}`;
  }
}

function checkHeroAvailability() {
  // Sprawdzamy, czy gracz ma zbudowany Ołtarz
  const hasAltar = buildings.some(b => b.type === 'altar');
  const heroBtn = document.getElementById('btn-troop-hero');
  if (!heroBtn) return;

  if (hasAltar && army.hero > 0) {
    heroBtn.classList.remove('disabled');
    document.getElementById('ui-hero').innerText = "Gotowy";
  } else {
    heroBtn.classList.add('disabled');
    document.getElementById('ui-hero').innerText = hasAltar ? "Zużyty" : "Brak Ołtarza";
    if (selectedBattleTroopType === 'hero') selectBattleTroop('barbarian');
  }
}

function resetGame() {
  if (confirm("Na pewno zresetować grę? Stracisz cały postęp.")) {
    localStorage.removeItem('warBaseSave'); location.reload();
  }
}

function selectBuilding(type) {
  selectedBuildingType = (selectedBuildingType === type) ? null : type;
  if (window.preview) window.preview.setVisible(false);
  closeBuildingPanel(); updateUI();
}

function centerCamera() {
  if (!baseSceneInstance) return;
  let target = buildings.find(b => b.type === 'townhall') || buildings[0];
  let cx = target ? target.x : (TILE * GRID) / 2;
  let cy = target ? target.y : (TILE * GRID) / 2;
  baseSceneInstance.cameras.main.pan(cx, cy, 300, 'Sine.easeInOut');
}

function openBuildingPanel(building) {
  currentlySelectedBuilding = building;
  const def = BUILDINGS[building.type];
  
  document.getElementById('bp-name').innerText = def.name;
  document.getElementById('bp-level').innerText = building.level;
  
  const now = Date.now();
  const isBuilding = building.buildEndTime > now;

  if (isBuilding) {
    const remain = Math.ceil((building.buildEndTime - now) / 1000);
    document.getElementById('bp-status-text').innerHTML = `🔨 W budowie: <span style="color:#ffaa00">${remain}s</span>`;
    document.getElementById('bp-upgrade').style.display = 'none';
    document.getElementById('bp-sell').style.display = 'none';
    document.getElementById('bp-train-section').style.display = 'none';
    document.getElementById('bp-lab-section').style.display = 'none';
  } else {
    document.getElementById('bp-status-text').innerHTML = `Produkcja: <span id="bp-prod">0</span>`;
    
    const prodGold = (def.prod.gold || 0) * building.level;
    const prodElixir = (def.prod.elixir || 0) * building.level;
    let prodStr = [];
    if (prodGold > 0) prodStr.push(prodGold + ' 🪙');
    if (prodElixir > 0) prodStr.push(prodElixir + ' 💧');
    document.getElementById('bp-prod').innerText = prodStr.join(' i ') || 'Brak';
    
    const upgradeCostGold = Math.floor(def.cost.gold * building.level * 1.5);
    const upgradeCostElixir = Math.floor(def.cost.elixir * building.level * 1.5);
    document.getElementById('bp-upgrade').innerText = `Ulepsz (${upgradeCostGold} 🪙, ${upgradeCostElixir} 💧)`;
    
    const sellValueGold = Math.floor(def.cost.gold * building.level * 0.5);
    const sellValueElixir = Math.floor(def.cost.elixir * building.level * 0.5);
    document.getElementById('bp-sell').innerText = `Sprzedaj (+${sellValueGold} 🪙, +${sellValueElixir} 💧)`;
    
    document.getElementById('bp-upgrade').style.display = 'block';
    document.getElementById('bp-sell').style.display = 'block';

    if (building.type === 'barracks') {
      document.getElementById('bp-train-section').style.display = 'block';
      updateUI(); 
    } else {
      document.getElementById('bp-train-section').style.display = 'none';
    }

    if (building.type === 'lab') {
      document.getElementById('bp-lab-section').style.display = 'block';
      updateLabUI();
    } else {
      document.getElementById('bp-lab-section').style.display = 'none';
    }
  }
  document.getElementById('building-panel').style.display = 'block';
}

function updateLabUI() {
  ['barbarian', 'archer', 'giant'].forEach(type => {
    const lvl = troopLevels[type];
    const cost = Math.floor(BASE_TROOPS[type].cost * lvl * 2.5); 
    const btn = document.getElementById('lab-up-' + type);
    if(btn) btn.innerText = `Ulepsz ${BASE_TROOPS[type].name} na L${lvl+1} (${cost} 💧)`;
  });
}

function upgradeTroop(type) {
  const lvl = troopLevels[type];
  const cost = Math.floor(BASE_TROOPS[type].cost * lvl * 2.5);
  
  if (elixir < cost) { showMessage('Za mało eliksiru!'); return; }
  
  elixir -= cost; troopLevels[type]++;
  playSound('build'); updateUI(); saveGame(); updateLabUI();
  showMessage(`Ulepszono ${BASE_TROOPS[type].name} do L${troopLevels[type]}!`);
}

function trainTroop(type) {
  const barracks = buildings.find(b => b.type === 'barracks' && b.buildEndTime <= Date.now());
  if (!barracks) { showMessage('Brak gotowych Koszar!'); return; }
  if (getCurrentArmySize() >= getMaxArmy()) { showMessage('Osiągnięto limit armii!'); return; }
  
  const cost = BASE_TROOPS[type].cost;
  if (elixir < cost) { showMessage('Za mało eliksiru!'); return; }

  elixir -= cost; army[type]++;
  playSound('build'); updateUI(); saveGame();
}

function closeBuildingPanel() {
  document.getElementById('building-panel').style.display = 'none';
  currentlySelectedBuilding = null;
}

function upgradeBuilding() {
  if (!currentlySelectedBuilding) return;
  const def = BUILDINGS[currentlySelectedBuilding.type];
  const townhall = buildings.find(b => b.type === 'townhall');
  
  if (currentlySelectedBuilding.type !== 'townhall' && townhall && currentlySelectedBuilding.level >= townhall.level) {
    showMessage('Ulepsz najpierw Ratusz!'); return;
  }
  
  const costGold = Math.floor(def.cost.gold * currentlySelectedBuilding.level * 1.5);
  const costElixir = Math.floor(def.cost.elixir * currentlySelectedBuilding.level * 1.5);
  
  if (gold < costGold) { showMessage('Za mało złota!'); return; }
  if (elixir < costElixir) { showMessage('Za mało eliksiru!'); return; }
  
  gold -= costGold; elixir -= costElixir;
  currentlySelectedBuilding.level++;
  playSound('build');
  
  currentlySelectedBuilding.buildEndTime = Date.now() + (def.buildTime * currentlySelectedBuilding.level * 1000);
  currentlySelectedBuilding.rect.setAlpha(0.5); currentlySelectedBuilding.icon.setAlpha(0.5);
  currentlySelectedBuilding.label.setAlpha(0.5);
  currentlySelectedBuilding.label.setText(def.name + ' L' + currentlySelectedBuilding.level);
  
  updateUI(); saveGame(); openBuildingPanel(currentlySelectedBuilding); 
}

function sellBuilding() {
  if (!currentlySelectedBuilding) return;
  const def = BUILDINGS[currentlySelectedBuilding.type];
  gold += Math.floor(def.cost.gold * currentlySelectedBuilding.level * 0.5);
  elixir += Math.floor(def.cost.elixir * currentlySelectedBuilding.level * 0.5);
  currentlySelectedBuilding.destroy();
  buildings = buildings.filter(b => b !== currentlySelectedBuilding);
  updateUI(); saveGame(); closeBuildingPanel();
}

function saveGame() {
  const data = { 
    version: 22, gold: gold, elixir: elixir, army: army, troopLevels: troopLevels,
    buildings: buildings.map(b => ({ x: b.x, y: b.y, type: b.type, level: b.level, hp: b.hp, maxHp: b.maxHp, buildEndTime: b.buildEndTime })) 
  };
  localStorage.setItem('warBaseSave', JSON.stringify(data));
}

function loadGame() {
  const saved = localStorage.getItem('warBaseSave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.version === 22 && typeof data.gold === 'number') {
        gold = data.gold; elixir = data.elixir; 
        army = data.army || { barbarian: 5, archer: 3, giant: 1, hero: 0 };
        troopLevels = data.troopLevels || { barbarian: 1, archer: 1, giant: 1 };
        return data.buildings || []; 
      } else { localStorage.removeItem('warBaseSave'); }
    } catch (e) { localStorage.removeItem('warBaseSave'); }
  }
  return [];
}

function selectBattleTroop(type) {
  selectedBattleTroopType = type;
  document.querySelectorAll('.troop-btn').forEach(btn => btn.classList.remove('selected'));
  const btn = document.getElementById('btn-troop-' + type);
  if (btn) btn.classList.add('selected');
}

function startAttack() {
  closeBuildingPanel();
  if (getCurrentArmySize() <= 0 && army.hero <= 0) { showMessage('Nie masz wojska!'); return; }
  
  // Sprawdzenie Ołtarza - jeśli jest, dodajemy Króla
  const hasAltar = buildings.some(b => b.type === 'altar');
  army.hero = (hasAltar) ? 1 : 0;

  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('defend-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('battle-ui').style.display = 'block';
  document.getElementById('timer-display').innerText = '3:00';
  
  selectBattleTroop('barbarian'); updateUI();
  checkHeroAvailability();
  
  isEndingBattle = false; playSound('build');
  game.scene.start('BattleScene');
}

function endBattle(won = false, lootGold = 0, lootElixir = 0) {
  if (isEndingBattle) return; 
  isEndingBattle = true;
  army = { barbarian: 0, archer: 0, giant: 0, hero: 0 }; 
  
  if (won) { gold += 500 + lootGold; elixir += 200 + lootElixir; playSound('coin'); } 
  else { gold += lootGold; elixir += lootElixir; }
  
  updateUI(); saveGame();
  if (won) alert(`Zwycięstwo!\nZdobyto łup: ${500 + lootGold} 🪙 i ${200 + lootElixir} 💧\n\nKliknij OK, aby wrócić.`);
  else alert(`Koniec bitwy.\nUratowany łup: ${lootGold} 🪙 i ${lootElixir} 💧\n\nKliknij OK, aby wrócić.`);
  
  window.location.reload();
}

function startDefense() {
  closeBuildingPanel(); saveGame(); 
  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('defend-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('defense-ui').style.display = 'block';
  document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: Gotowy)';
  playSound('build'); game.scene.start('DefenseScene');
}

function endDefense(won) {
  const defenseScene = game.scene.getScene('DefenseScene');
  if (defenseScene) {
    const survivingBuildings = defenseScene.playerBuildings.filter(b => b.alive).map(b => ({ x: b.x, y: b.y, type: b.type, level: b.level, hp: b.hp, maxHp: b.maxHp, buildEndTime: b.buildEndTime }));
    let data = JSON.parse(localStorage.getItem('warBaseSave'));
    if (!data) data = { version: 22, gold: 3000, elixir: 1000, army: { barbarian: 0, archer: 0, giant: 0, hero: 0 }, troopLevels: { barbarian: 1, archer: 1, giant: 1 }, buildings: [] };
    data.buildings = survivingBuildings;
    if (won) { data.gold += 300; data.elixir += 150; playSound('coin'); }
    localStorage.setItem('warBaseSave', JSON.stringify(data));
  }
  if (won) alert("Obrona udana!\nZdobyto 300 🪙 i 150 💧\n\nKliknij OK.");
  else alert("Twoja baza została zniszczona!\n\nKliknij OK.");
  window.location.reload();
}

class BaseScene extends Phaser.Scene {
  constructor() { super('BaseScene'); }
  create() {
    baseSceneInstance = this; 
    let cam = this.cameras.main;
    let grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2d4a3e, 1, 0x5a8a6e, 1);
    grid.setOrigin(0, 0);
    
    window.preview = this.add.rectangle(0, 0, TILE - 4, TILE - 4, 0xffffff, 0.5).setVisible(false).setDepth(10);
    this.fpsText = this.add.text(10, 50, 'FPS: 0', { fontSize: '14px', color: '#00ff00', backgroundColor: '#00000088', padding: {x: 10, y: 10} }).setScrollFactor(0).setDepth(20);

    buildings = []; 
    try { loadGame().forEach(b => this.createBuilding(b.x, b.y, b.type, false, b.level || 1, b.hp || null, b.buildEndTime || 0)); } catch (e) {}
    updateUI();

    this.lastGridX = -1; this.lastGridY = -1;
    this.input.on('pointerdown', (p) => { this.lastGridX = -1; this.lastGridY = -1; if (selectedBuildingType === 'wall') this.tryPlaceBuilding(p); });
    this.input.on('pointermove', (p) => {
      if (selectedBuildingType) {
        if (window.preview) { window.preview.setFillStyle(BUILDINGS[selectedBuildingType].color, 0.6); window.preview.setPosition(this.snap(p.worldX), this.snap(p.worldY)).setVisible(true); }
        if (selectedBuildingType === 'wall' && p.isDown) this.tryPlaceBuilding(p);
      } else if (p.isDown) {
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom; cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on('pointerup', (p) => { if (selectedBuildingType && selectedBuildingType !== 'wall') this.tryPlaceBuilding(p); if (window.preview) window.preview.setVisible(false); });
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0); centerCamera(); 
  }

  update(time, delta) {
    if (this.fpsText) this.fpsText.setText('FPS: ' + Math.round(this.game.loop.actualFps));
    let now = Date.now();
    buildings.forEach(b => {
      if (b.buildEndTime > now) { b.buildText.setText('🔨 ' + Math.ceil((b.buildEndTime - now) / 1000) + 's'); } 
      else if (b.buildEndTime > 0) {
        b.buildEndTime = 0; b.buildText.setText(''); b.rect.setAlpha(1); b.icon.setAlpha(1); b.label.setAlpha(1);
        saveGame(); if (currentlySelectedBuilding === b) openBuildingPanel(b);
      }
    });
    prodTimer += delta;
    if (prodTimer >= 1000) {
      let aG = 0, aE = 0;
      buildings.forEach(b => { if (b.buildEndTime <= now) { aG += (BUILDINGS[b.type].prod.gold || 0) * b.level; aE += (BUILDINGS[b.type].prod.elixir || 0) * b.level; } });
      if (aG > 0 || aE > 0) { gold += aG; elixir += aE; updateUI(); }
      prodTimer = 0;
    }
  }

  snap(v) { return Math.floor(v / TILE) * TILE + TILE / 2; }

  tryPlaceBuilding(p) {
    const def = BUILDINGS[selectedBuildingType];
    const x = this.snap(p.worldX); const y = this.snap(p.worldY);
    if (x === this.lastGridX && y === this.lastGridY) return;
    if (x < TILE / 2 || y < TILE / 2 || x > (GRID - 0.5) * TILE || y > (GRID - 0.5) * TILE) return;
    if (buildings.some(b => b.gridX === x && b.gridY === y)) return;
    
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

  createBuilding(x, y, type, isNew, level, hp = null, buildEndTime = 0) {
    const def = BUILDINGS[type];
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, TILE - 4, TILE - 4, def.color).setStrokeStyle(2, def.stroke);
    const icon = this.add.text(0, -5, def.short, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const label = this.add.text(0, 20, def.name + ' L' + level, { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const buildText = this.add.text(0, -35, '', { fontSize: '18px', color: '#ffaa00', fontStyle: 'bold', backgroundColor: '#00000088' }).setOrigin(0.5);
    const hpBarBg = this.add.rectangle(0, -TILE/2 + 6, TILE - 8, 8, 0x000000);
    const hpBar = this.add.rectangle(-(TILE - 8)/2, -TILE/2 + 6, TILE - 8, 8, 0x00ff00).setOrigin(0, 0.5);
    
    container.add([rect, icon, label, hpBarBg, hpBar, buildText]);
    container.setSize(TILE, TILE).setInteractive({ useHandCursor: true });
    container.type = type; container.gridX = x; container.gridY = y; container.level = level;
    container.label = label; container.hpBar = hpBar; container.rect = rect; container.icon = icon; container.buildText = buildText;
    container.buildEndTime = isNew ? Date.now() + (def.buildTime * level * 1000) : buildEndTime;
    
    if (container.buildEndTime > Date.now()) { rect.setAlpha(0.5); icon.setAlpha(0.5); label.setAlpha(0.5); }
    container.hp = hp !== null ? hp : def.hp * level; container.maxHp = def.hp * level; container.hpBar.scaleX = container.hp / container.maxHp;

    container.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation(); if (selectedBuildingType) return; openBuildingPanel(container);
    });
    buildings.push(container); if (isNew && window.preview) window.preview.setVisible(false);
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  create() {
    let cam = this.cameras.main;
    cam.setBackgroundColor('#3e1a1a'); cam.setScroll(0, 0); cam.setZoom(1);
    this.enemyBuildings = []; this.troops = []; this.battleEnded = false;
    this.lootGold = 0; this.lootElixir = 0; this.lastDamageText = 0;
    
    this.battleTime = 180; 
    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.battleEnded) return;
        this.battleTime--;
        let m = Math.floor(this.battleTime / 60);
        let s = this.battleTime % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (this.battleTime <= 0) {
          this.battleEnded = true;
          setTimeout(() => endBattle(false, this.lootGold, this.lootElixir), 1000); 
        }
      }
    });

    document.getElementById('loot-display').innerText = '0 🪙, 0 💧';
    const cx = window.innerWidth / 2; const cy = window.innerHeight / 2;

    this.createEnemyBuilding(cx, cy, 400, 0x8b0000, 'Ratusz', 'R', false, 200, 100); 

    let numBuildings = Phaser.Math.Between(6, 9);
    for(let i = 0; i < numBuildings; i++) {
        let ex, ey, valid, attempts = 0;
        do {
            let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            let dist = Phaser.Math.Between(120, 220);
            ex = cx + Math.cos(angle) * dist; ey = cy + Math.sin(angle) * dist;
            valid = true;
            for (let b of this.enemyBuildings) { if (Phaser.Math.Distance.Between(ex, ey, b.x, b.y) < 80) { valid = false; break; } }
            attempts++;
        } while(!valid && attempts < 20);
        
        if (valid) {
            let typeRnd = Phaser.Math.Between(1, 10);
            if (typeRnd <= 3) this.createEnemyBuilding(ex, ey, 150, 0x555555, 'Wieża', 'W', true, 0, 0);
            else if (typeRnd <= 6) this.createEnemyBuilding(ex, ey, 100, 0xffd700, 'Kopalnia', 'K', false, 300, 0);
            else if (typeRnd <= 8) this.createEnemyBuilding(ex, ey, 150, 0x8b0000, 'Koszary', 'Ko', false, 0, 200);
            else this.createEnemyBuilding(ex, ey, 250, 0x808080, 'Mur', 'M', false, 0, 0);
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

  createEnemyBuilding(x, y, hp, color, name, short, isDefense, lootG, lootE) {
    const size = 60;
    const rect = this.add.rectangle(x, y, size, size, color).setStrokeStyle(2, 0x000000);
    this.add.text(x, y - 5, short, {fontSize: '20px', color: '#fff', fontStyle: 'bold'}).setOrigin(0.5);
    this.add.text(x, y + 20, name, {fontSize: '11px', color: '#fff'}).setOrigin(0.5);
    this.add.rectangle(x, y - 40, size, 8, 0x000000);
    const hpBar = this.add.rectangle(x - size/2, y - 40, size, 8, 0x00ff00).setOrigin(0, 0.5);
    this.enemyBuildings.push({ sprite: rect, hpBar: hpBar, hp: hp, maxHp: hp, x: x, y: y, alive: true, isDefense: isDefense, lootG: lootG, lootE: lootE });
  }

  spawnTroop(x, y, type) {
    const def = getTroopStats(type); 
    let bgColor = '#1e90ff'; // Niebieski dla zwykłych
    if (type === 'hero') bgColor = '#ff8c00'; // Pomarańczowy/Złoty dla Króla
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
      troop.hpBar.width = barWidth * (troop.hp / troop.maxHp); 
      troop.hpBar.setPosition(troop.x - barWidth/2, troop.y - (troop.type==='hero'?30:24));

      if (!troop.target || !troop.target.alive) troop.target = this.findNearestBuilding(troop.x, troop.y, troop.def.target);
      
      if (troop.target) {
        const dist = Phaser.Math.Distance.Between(troop.x, troop.y, troop.target.x, troop.target.y);
        if (dist > troop.def.range) {
          const angle = Phaser.Math.Angle.Between(troop.x, troop.y, troop.target.x, troop.target.y);
          troop.x += Math.cos(angle) * troop.def.speed * dt; troop.y += Math.sin(angle) * troop.def.speed * dt;
          troop.sprite.setPosition(troop.x, troop.y);
        } else {
          let dmg = troop.def.damage * dt; 
          troop.target.hp -= dmg; troop.target.hpBar.scaleX = Math.max(0, troop.target.hp / troop.target.maxHp);
          
          if (time > this.lastDamageText + 200) { this.showDamageText(troop.target.x + Phaser.Math.Between(-20, 20), troop.target.y, dmg * 5); this.lastDamageText = time; }
          
          if (troop.target.hp <= 0) {
            troop.target.alive = false; this.explode(troop.target.x, troop.target.y, 0xffaa00); playSound('boom');
            troop.target.sprite.destroy(); troop.target.hpBar.destroy(); 
            if (troop.target.lootG > 0 || troop.target.lootE > 0) {
              this.lootGold += troop.target.lootG; this.lootElixir += troop.target.lootE;
              document.getElementById('loot-display').innerText = `${this.lootGold} 🪙, ${this.lootElixir} 💧`;
              this.showDamageText(troop.target.x, troop.target.y, '+' + troop.target.lootG + ' 🪙'); playSound('coin');
            }
            troop.target = null; 
          }
        }
      }
    }

    if (this.enemyBuildings.filter(b => b.alive).length === 0) {
      this.battleEnded = true; setTimeout(() => endBattle(true, this.lootGold, this.lootElixir), 1000);
    } else if (army.barbarian + army.archer + army.giant + army.hero === 0 && this.troops.length === 0 && !this.battleEnded) {
      this.battleEnded = true; setTimeout(() => endBattle(false, this.lootGold, this.lootElixir), 1000);
    }
  }

  findNearestBuilding(x, y, targetType) {
    let nearest = null, minDist = Infinity;
    this.enemyBuildings.forEach(b => {
      if (b.alive) {
        const hasDefenses = this.enemyBuildings.some(eb => eb.alive && eb.isDefense);
        if (targetType === 'defense' && hasDefenses && !b.isDefense) return;
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
    let cam = this.cameras.main;
    cam.setBackgroundColor('#2d4a3e');
    let grid = this.add.grid(0, 0, TILE * GRID, TILE * GRID, TILE, TILE, 0x2d4a3e, 1, 0x5a8a6e, 1);
    grid.setOrigin(0, 0);
    this.playerBuildings = [];
    const saved = loadGame(); 
    saved.forEach(b => {
      const def = BUILDINGS[b.type];
      const container = this.add.container(b.x, b.y);
      const rect = this.add.rectangle(0, 0, TILE - 4, TILE - 4, def.color).setStrokeStyle(2, def.stroke);
      const icon = this.add.text(0, -5, def.short, { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      const label = this.add.text(0, 20, def.name + ' L' + b.level, { fontSize: '11px', color: '#fff' }).setOrigin(0.5);
      const hpBarBg = this.add.rectangle(0, -TILE/2 + 6, TILE - 8, 8, 0x000000);
      const hpBar = this.add.rectangle(-(TILE - 8)/2, -TILE/2 + 6, TILE - 8, 8, 0x00ff00).setOrigin(0, 0.5);
      container.add([rect, icon, label, hpBarBg, hpBar]);
      this.playerBuildings.push({ sprite: container, rect: rect, hpBar: hpBar, x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, type: b.type, level: b.level, alive: true, isDefense: (b.type === 'tower'), buildEndTime: b.buildEndTime });
    });
    
    const townhall = this.playerBuildings.find(b => b.type === 'townhall');
    let centerX = townhall ? townhall.x : (this.playerBuildings.length > 0 ? this.playerBuildings[0].x : TILE * GRID / 2);
    let centerY = townhall ? townhall.y : (this.playerBuildings.length > 0 ? this.playerBuildings[0].y : TILE * GRID / 2);
    cam.setBounds(0, 0, TILE * GRID, TILE * GRID); cam.setZoom(1.0);
    cam.scrollX = centerX - cam.width / 2 / cam.zoom; cam.scrollY = centerY - cam.height / 2 / cam.zoom;
    this.centerBase = { x: centerX, y: centerY };

    this.enemies = []; this.waveCount = 0; this.battleEnded = false; this.mortarCooldown = 0; 
    this.spawnWave();
    
    this.time.addEvent({
      delay: 1500, loop: true, callback: () => {
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
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.battleEnded || this.mortarCooldown > 0) return;
      const clickX = pointer.worldX; const clickY = pointer.worldY;
      const blast = this.add.circle(clickX, clickY, 80, 0xffaa00, 0.6);
      this.time.delayedCall(200, () => blast.destroy()); playSound('boom');
      this.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const dist = Phaser.Math.Distance.Between(clickX, clickY, enemy.x, enemy.y);
        if (dist <= 80) enemy.hp -= 100;
      });
      this.mortarCooldown = 3000; document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: 3s)';
      this.time.addEvent({
        delay: 1000, repeat: 2, callback: () => {
          if (this.battleEnded) return;
          this.mortarCooldown -= 1000;
          if (this.mortarCooldown <= 0) document.getElementById('defense-status').innerText = '🛡️ Obrona Bazy (Moździerz: Gotowy)';
          else document.getElementById('defense-status').innerText = `🛡️ Obrona Bazy (Moździerz: ${this.mortarCooldown/1000}s)`;
        }
      });
    });
    
    this.time.addEvent({ delay: 10000, loop: true, callback: () => { if (!this.battleEnded) this.spawnWave(); } });
  }
  
  spawnWave() {
    this.waveCount++;
    const numEnemies = 2 + this.waveCount * 2; 
    for (let i = 0; i < numEnemies; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2); const distance = Phaser.Math.Between(400, 600); 
      const x = this.centerBase.x + Math.cos(angle) * distance; const y = this.centerBase.y + Math.sin(angle) * distance;
      const sprite = this.add.text(x, y, 'W', { fontSize: '20px', color: '#fff', backgroundColor: '#ff0000', padding: {x:4, y:4} }).setOrigin(0.5);
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

const config = {
  type: Phaser.CANVAS, 
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d4a3e',
  render: { clearBeforeRender: false },
  scene: [BaseScene, BattleScene, DefenseScene]
};
const game = new Phaser.Game(config);