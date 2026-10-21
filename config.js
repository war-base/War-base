const TILE_W = 64; 
const TILE_H = 32; 
const GRID = 20;   

let gold = 3000; 
let elixir = 1000; 
let trophies = 0;
let xp = 0;
let level = 1;
let soundEnabled = true; 
let lastDailyReward = 0; 

let wins = 0, losses = 0, destroyedTotal = 0;

let army = { barbarian: 5, archer: 3, giant: 1, wallbreaker: 0, hero: 0 }; 
let troopLevels = { barbarian: 1, archer: 1, giant: 1 }; 
let selectedBattleTroopType = 'barbarian';

let quests = [
  { id: 'q1', title: 'Pierwsze kroki', desc: 'Zbuduj Kopalnię.', target: 1, current: 0, reward: { gold: 200, elixir: 0, xp: 20 }, claimed: false, type: 'build_mine' },
  { id: 'q2', title: 'Mobilizacja', desc: 'Zrekrutuj 3 nowych jednostek.', target: 3, current: 0, reward: { gold: 0, elixir: 150, xp: 30 }, claimed: false, type: 'train_troop' },
  { id: 'q3', title: 'Rozbudowa', desc: 'Ulepsz Warownię na Poziom 2.', target: 1, current: 0, reward: { gold: 500, elixir: 300, xp: 100 }, claimed: false, type: 'upgrade_townhall' },
  { id: 'q4', title: 'Niszczyciel', desc: 'Zniszcz 10 budynków wroga.', target: 10, current: 0, reward: { gold: 400, elixir: 0, xp: 50 }, claimed: false, type: 'destroy_buildings' },
  { id: 'q5', title: 'Dowódca', desc: 'Zbuduj Ołtarz Krwi.', target: 1, current: 0, reward: { gold: 1000, elixir: 0, xp: 150 }, claimed: false, type: 'build_altar' },
  { id: 'q6', title: 'Architekt', desc: 'Ulepsz dowolny budynek.', target: 1, current: 0, reward: { gold: 300, elixir: 100, xp: 40 }, claimed: false, type: 'upgrade_any' },
  { id: 'q7', title: 'Wojownik', desc: 'Wygraj bitwę.', target: 1, current: 0, reward: { gold: 500, elixir: 200, xp: 80 }, claimed: false, type: 'win_battle' },
  { id: 'q8', title: 'Saper', desc: 'Wyszkol 3 Saperów.', target: 3, current: 0, reward: { gold: 300, elixir: 200, xp: 50 }, claimed: false, type: 'train_wallbreaker' },
  { id: 'q9', title: 'Burzyciel', desc: 'Zniszcz 5 Murów wroga.', target: 5, current: 0, reward: { gold: 600, elixir: 0, xp: 80 }, claimed: false, type: 'destroy_walls' }
];

const BUILDINGS = {
  townhall: { name: 'Warownia', short: 'W', cost: { gold: 1000, elixir: 0 }, color: 0x555555, roofColor: 0x333333, prod: { gold: 0, elixir: 0 }, hp: 1000, buildTime: 60, size: 2 },
  mine: { name: 'Kopalnia', short: 'K', cost: { gold: 0, elixir: 150 }, color: 0x8b6508, roofColor: 0x5c4305, prod: { gold: 10, elixir: 0 }, hp: 400, buildTime: 15, size: 1 },
  barracks: { name: 'Koszary', short: 'Ko', cost: { gold: 0, elixir: 150 }, color: 0x5c2e2e, roofColor: 0x3b1a1a, prod: { gold: 0, elixir: 5 }, hp: 600, buildTime: 20, size: 1 },
  camp: { name: 'Obóz', short: 'O', cost: { gold: 0, elixir: 250 }, color: 0x4a5c38, roofColor: 0x2e3b22, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 30, size: 1 },
  lab: { name: 'Wieża Magów', short: 'M', cost: { gold: 0, elixir: 500 }, color: 0x483d8b, roofColor: 0x2e2757, prod: { gold: 0, elixir: 0 }, hp: 800, buildTime: 40, size: 1 },
  altar: { name: 'Ołtarz Krwi', short: '🩸', cost: { gold: 2000, elixir: 0 }, color: 0x2a1a30, roofColor: 0x550000, prod: { gold: 0, elixir: 0 }, hp: 1200, buildTime: 50, size: 1 },
  wall: { name: 'Mur', short: 'M', cost: { gold: 50, elixir: 0 }, color: 0x696969, roofColor: 0x404040, prod: { gold: 0, elixir: 0 }, hp: 500, buildTime: 5, size: 1 },
  tower: { name: 'Wieża Straż.', short: 'WS', cost: { gold: 300, elixir: 0 }, color: 0x36454f, roofColor: 0x1a2025, prod: { gold: 0, elixir: 0 }, hp: 600, buildTime: 30, size: 1 }
};

const BASE_TROOPS = {
  barbarian: { name: 'Wojownik', short: 'W', hp: 60, damage: 15, speed: 150, range: 40, cost: 50, target: 'any' },
  archer: { name: 'Łucznik', short: 'Ł', hp: 40, damage: 10, speed: 130, range: 180, cost: 75, target: 'any' },
  giant: { name: 'Golem', short: 'G', hp: 400, damage: 25, speed: 60, range: 40, cost: 150, target: 'defense' },
  wallbreaker: { name: 'Saper', short: 'S', hp: 30, damage: 500, speed: 200, range: 20, cost: 100, target: 'wall' }, 
  hero: { name: 'Watażka', short: '🩸', hp: 1500, damage: 80, speed: 120, range: 50, cost: 0, target: 'any' } 
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

function getTroopStats(type) {
  const base = BASE_TROOPS[type];
  let lvl = troopLevels[type] || 1;
  let multiplier = 1 + (lvl - 1) * 0.3;
  if (type === 'hero' || type === 'wallbreaker') multiplier = 1; 
  return { name: base.name, short: base.short, speed: base.speed, range: base.range, cost: base.cost, target: base.target, hp: Math.floor(base.hp * multiplier), damage: Math.floor(base.damage * multiplier) };
}

function getMaxArmy() { let max = 10; buildings.forEach(b => { if (b.type === 'camp') max += 10 * b.level; }); return max; }
function getCurrentArmySize() { return army.barbarian + army.archer + army.giant + army.wallbreaker; }

function playSound(type) {
  if (!soundEnabled) return; 
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'build') { osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); } 
    else if (type === 'shoot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); } 
    else if (type === 'boom') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); osc.start(); osc.stop(audioCtx.currentTime + 0.3); } 
    else if (type === 'coin') { osc.type = 'sine'; osc.frequency.setValueAtTime(1200, audioCtx.currentTime); osc.frequency.setValueAtTime(1600, audioCtx.currentTime + 0.05); gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2); osc.start(); osc.stop(audioCtx.currentTime + 0.2); }
  } catch(e) {}
}

function saveGame() {
  const data = { version: 35, gold: gold, elixir: elixir, army: army, troopLevels: troopLevels, trophies: trophies, xp: xp, level: level, soundEnabled: soundEnabled, lastDailyReward: lastDailyReward, wins: wins, losses: losses, destroyedTotal: destroyedTotal, quests: quests, buildings: buildings.map(b => ({ gridX: b.gridX, gridY: b.gridY, type: b.type, level: b.level, hp: b.hp, maxHp: b.maxHp, buildEndTime: b.buildEndTime })) };
  localStorage.setItem('warBaseSave', JSON.stringify(data));
}

function loadGame() {
  const saved = localStorage.getItem('warBaseSave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.version === 35 && typeof data.gold === 'number') {
        gold = data.gold; elixir = data.elixir; army = data.army || { barbarian: 5, archer: 3, giant: 1, wallbreaker: 0, hero: 0 }; troopLevels = data.troopLevels || { barbarian: 1, archer: 1, giant: 1 }; trophies = data.trophies || 0; xp = data.xp || 0; level = data.level || 1; soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true; lastDailyReward = data.lastDailyReward || 0; wins = data.wins || 0; losses = data.losses || 0; destroyedTotal = data.destroyedTotal || 0; if(data.quests) quests = data.quests; return data.buildings || []; 
      } else { localStorage.removeItem('warBaseSave'); }
    } catch (e) { localStorage.removeItem('warBaseSave'); }
  }
  return [];
}