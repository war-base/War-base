const TILE = 64; 
const GRID = 25; 

let gold = 1000;
let elixir = 1000;

let army = { barbarian: 5, archer: 3, giant: 1 }; 
let troopLevels = { barbarian: 1, archer: 1, giant: 1 }; 
let selectedBattleTroopType = 'barbarian';

// Zamiast emoji, używamy literowych kodów dla grafiki w grze (zapobiega czerwonym krzyżykom)
const BUILDINGS = {
  townhall: { name: 'Ratusz', short: 'R', cost: { gold: 1000, elixir: 0 }, color: 0x8b4513, stroke: 0x5a2d0c, prod: { gold: 0, elixir: 0 }, hp: 1000, buildTime: 60 },
  mine: { name: 'Kopalnia', short: 'K', cost: { gold: 0, elixir: 150 }, color: 0xffd700, stroke: 0xb8860b, prod: { gold: 10, elixir: 0 }, hp: 400, buildTime: 15 },
  barracks: { name: 'Koszary', short: 'Ko', cost: { gold: 0, elixir: 150 }, color: 0x8b0000, stroke: 0x4a0000, prod: { gold: 0, elixir: 5 }, hp: 600, buildTime: 20 },
  camp: { name: 'Obóz', short: 'O', cost: { gold: 0, elixir: 250 }, color: 0x228b22, stroke: 0x006400, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 30 },
  lab: { name: 'Laboratorium', short: 'L', cost: { gold: 0, elixir: 500 }, color: 0x8a2be2, stroke: 0x4b0082, prod: { gold: 0, elixir: 0 }, hp: 800, buildTime: 40 },
  wall: { name: 'Mur', short: 'M', cost: { gold: 50, elixir: 0 }, color: 0x808080, stroke: 0x404040, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 5 },
  tower: { name: 'Wieża', short: 'W', cost: { gold: 300, elixir: 0 }, color: 0x555555, stroke: 0x000000, prod: { gold: 0, elixir: 0 }, hp: 600, buildTime: 30 }
};

const BASE_TROOPS = {
  barbarian: { name: 'Barbarzyńca', short: 'B', hp: 60, damage: 15, speed: 150, range: 40, cost: 50, target: 'any' },
  archer: { name: 'Łucznik', short: 'Ł', hp: 40, damage: 10, speed: 130, range: 180, cost: 75, target: 'any' },
  giant: { name: 'Gigant', short: 'G', hp: 400, damage: 25, speed: 60, range: 40, cost: 150, target: 'defense' }
};

let selectedBuildingType = null;
let buildings = [];
let currentlySelectedBuilding = null;
let baseSceneInstance = null; 
let lastGoldWarningTime = 0; 
let messageTimeout = null;
let isEndingBattle = false;

function getTroopStats(type) {
  const base = BASE_TROOPS[type];
  const lvl = troopLevels[type];
  const multiplier = 1 + (lvl - 1) * 0.3;
  return {
    name: base.name, short: base.short, speed: base.speed, range: base.range, cost: base.cost, target: base.target,
    hp: Math.floor(base.hp * multiplier),
    damage: Math.floor(base.damage * multiplier)
  };
}

// --- DŹWIĘK ---
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

// --- INTERFEJS ---
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
function getCurrentArmySize() { return army.barbarian + army.archer + army.giant; }

function updateUI() {
  document.getElementById('ui-gold').innerText = Math.floor(gold);
  document.getElementById('ui-elixir').innerText = Math.floor(elixir);
  const btns = document.querySelectorAll('.build-btn');
  if (btns.length >= 7) {
    btns.forEach(btn => btn.classList.remove('selected'));
    if (selectedBuildingType === 'townhall') btns[0].classList.add('selected');
    if (selectedBuildingType === 'mine') btns[1].classList.add('selected');
    if (selectedBuildingType === 'barracks') btns[2].classList.add('selected');
    if (selectedBuildingType === 'camp') btns[3].classList.add('selected');
    if (selectedBuildingType === 'lab') btns[4].classList.add('selected');
    if (selectedBuildingType === 'wall') btns[5].classList.add('selected');
    if (selectedBuildingType === 'tower') btns[6].classList.add('selected');
  }
  
  if(document.getElementById('ui-barbarian')) document.getElementById('ui-barbarian').innerText = army.barbarian;
  if(document.getElementById('ui-archer')) document.getElementById('ui-archer').innerText = army.archer;
  if(document.getElementById('ui-giant')) document.getElementById('ui-giant').innerText = army.giant;
  
  if(document.getElementById('bp-army-capacity')) {
    document.getElementById('bp-army-capacity').innerText = `${getCurrentArmySize()} / ${getMaxArmy()}`;
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
    version: 18, gold: gold, elixir: elixir, army: army, troopLevels: troopLevels,
    buildings: buildings.map(b => ({ x: b.x, y: b.y, type: b.type, level: b.level, hp: b.hp, maxHp: b.maxHp, buildEndTime: b.buildEndTime })) 
  };
  localStorage.setItem('warBaseSave', JSON.stringify(data));
}

function loadGame() {
  const saved = localStorage.getItem('warBaseSave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.version === 18 && typeof data.gold === 'number') {
        gold = data.gold; elixir = data.elixir; 
        army = data.army || { barbarian: 5, archer: 3, giant: 1 };
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
  document.getElementById('btn-troop-' + type).classList.add('selected');
}

function startAttack() {
  closeBuildingPanel();
  if (getCurrentArmySize() <= 0) { showMessage('Nie masz wojska!'); return; }
  
  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('defend-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('battle-ui').style.display = 'block';
  document.getElementById('timer-display').innerText = '3:00';
  
  selectBattleTroop('barbarian'); updateUI();
  isEndingBattle = false; playSound('build');
  game.scene.start('BattleScene');
}

function endBattle(won = false, lootGold = 0, lootElixir = 0) {
  if (isEndingBattle) return; 
  isEndingBattle = true;
  army = { barbarian: 0, archer: 0, giant: 0 }; 
  
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
    if (!data) data = { version: 18, gold: 1000, elixir: 1000, army: { barbarian: 0, archer: 0, giant: 0 }, troopLevels: { barbarian: 1, archer: 1, giant: 1 }, buildings: [] };
    data.buildings = survivingBuildings;
    if (won) { data.gold += 300; data.elixir += 150; playSound('coin'); }
    localStorage.setItem('warBaseSave', JSON.stringify(data));
  }
  if (won) alert("Obrona udana!\nZdobyto 300 🪙 i 150 💧\n\nKliknij OK.");
  else alert("Twoja baza została zniszczona!\n\nKliknij OK.");
  window.location.reload();
}