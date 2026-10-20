const TILE = 64; 
const GRID = 25; 

let gold = 1000;
let elixir = 1000;
let selectedBuildingType = null;
let buildings = [];
let prodTimer = 0;

const BUILDINGS = {
  townhall: { name: 'Ratusz', cost: { gold: 1000, elixir: 0 }, color: 0x8b4513, stroke: 0x5a2d0c, prod: { gold: 0, elixir: 0 } },
  mine: { name: 'Kopalnia', cost: { gold: 0, elixir: 150 }, color: 0xffd700, stroke: 0xb8860b, prod: { gold: 10, elixir: 0 } },
  barracks: { name: 'Koszary', cost: { gold: 0, elixir: 300 }, color: 0x8b0000, stroke: 0x4a0000, prod: { gold: 0, elixir: 5 } }
};

const TROOP_STATS = {
  damage: 15, speed: 150, range: 40
};

function updateUI() {
  const gEl = document.getElementById('ui-gold');
  const eEl = document.getElementById('ui-elixir');
  if (gEl) gEl.innerText = Math.floor(gold);
  if (eEl) eEl.innerText = Math.floor(elixir);
  
  const btns = document.querySelectorAll('.build-btn');
  if (btns.length >= 3) {
    btns.forEach(btn => btn.classList.remove('selected'));
    if (selectedBuildingType === 'townhall') btns[0].classList.add('selected');
    if (selectedBuildingType === 'mine') btns[1].classList.add('selected');
    if (selectedBuildingType === 'barracks') btns[2].classList.add('selected');
  }
}

function selectBuilding(type) {
  selectedBuildingType = (selectedBuildingType === type) ? null : type;
  if (window.preview) window.preview.setVisible(false);
  updateUI();
}

function showMessage(text) {
  const msg = document.getElementById('message');
  if (!msg) return;
  msg.innerText = text;
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2000);
}

function saveGame() {
  const data = { 
    version: 2, 
    gold: gold, 
    elixir: elixir, 
    buildings: buildings.map(b => ({ x: b.x, y: b.y, type: b.type })) 
  };
  localStorage.setItem('warBaseSave', JSON.stringify(data));
}

function loadGame() {
  const saved = localStorage.getItem('warBaseSave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.version === 2 && typeof data.gold === 'number') {
        gold = data.gold; elixir = data.elixir;
        return data.buildings;
      } else {
        localStorage.removeItem('warBaseSave'); // Usuwa stary, zepsuty zapis
      }
    } catch (e) {
      localStorage.removeItem('warBaseSave');
    }
  }
  return [];
}