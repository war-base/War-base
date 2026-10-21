function selectBuilding(type) {
  selectedBuildingType = (selectedBuildingType === type) ? null : type;
  if (window.preview) window.preview.setVisible(false);
  closeBuildingPanel(); updateUI();
}

function centerCamera() {
  if (!baseSceneInstance) return;
  let target = buildings.find(b => b.type === 'townhall') || buildings[0];
  let cx = target ? gridToScreen(target.gridX, target.gridY).x : 0;
  let cy = target ? gridToScreen(target.gridX, target.gridY).y : 0;
  baseSceneInstance.cameras.main.pan(cx, cy, 300, 'Sine.easeInOut');
}

function selectBattleTroop(type) {
  selectedBattleTroopType = type;
  document.querySelectorAll('.troop-btn').forEach(btn => btn.classList.remove('selected'));
  const btn = document.getElementById('btn-troop-' + type);
  if (btn) btn.classList.add('selected');
}

function startAttack() {
  closeBuildingPanel();
  if (getCurrentArmySize() <= 0 && army.hero <= 0) { showMessage('Brak wojska do ataku!'); return; }
  const hasAltar = buildings.some(b => b.type === 'altar');
  army.hero = (hasAltar) ? 1 : 0;

  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('shop-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('menu-btn').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('battle-ui').style.display = 'block';
  document.getElementById('timer-display').innerText = '3:00';
  
  selectBattleTroop('barbarian'); updateUI(); checkHeroAvailability();
  isEndingBattle = false; playSound('build');
  game.scene.start('BattleScene');
}

function endBattle(won = false, lootGold = 0, lootElixir = 0, destroyedBuildings = 0, totalBuildings = 1) {
  if (isEndingBattle) return; 
  isEndingBattle = true;
  army = { barbarian: 0, archer: 0, giant: 0, wallbreaker: 0, hero: 0 }; 
  
  let destroyPercent = Math.floor((destroyedBuildings / totalBuildings) * 100);
  if (destroyPercent > 100) destroyPercent = 100;
  let stars = 0;
  if (destroyPercent >= 50) stars = 1;
  if (destroyPercent >= 75) stars = 2;
  if (destroyPercent >= 100 || (won && destroyPercent === 100)) stars = 3;

  let xpGained = destroyedBuildings * 25; let trophiesGained = 0;
  updateQuest('destroy_buildings', destroyedBuildings);

  if (won) {
    gold += 500 + lootGold; elixir += 200 + lootElixir; 
    trophiesGained = 5; trophies += trophiesGained;
    xpGained += 100; updateQuest('win_battle', 1); playSound('coin'); 
    wins++;
  } else {
    gold += lootGold; elixir += lootElixir;
    trophiesGained = -2; trophies = Math.max(0, trophies - 2); 
    losses++;
  }
  destroyedTotal += destroyedBuildings;
  
  addXP(xpGained); updateUI(); saveGame();
  
  document.getElementById('result-title').innerText = won ? "Zwycięstwo!" : "Odwrót";
  document.getElementById('result-title').style.color = won ? '#ffd700' : '#ff6666';
  for(let i = 1; i <= 3; i++) {
    let starEl = document.getElementById('star' + i);
    if (i <= stars) starEl.classList.add('earned'); else starEl.classList.remove('earned');
  }
  document.getElementById('result-destroyed').innerText = `Zniszczono: ${destroyPercent}% bazy`;
  document.getElementById('result-gold').innerText = (won ? 500 + lootGold : lootGold);
  document.getElementById('result-elixir').innerText = (won ? 200 + lootElixir : lootElixir);
  document.getElementById('result-trophies').innerText = (trophiesGained > 0 ? '+' : '') + trophiesGained;
  document.getElementById('result-xp').innerText = xpGained;
  document.getElementById('battle-result-overlay').style.display = 'flex';
}

function closeBattleResult() { window.location.reload(); }

function startDefense() {
  closeBuildingPanel(); saveGame(); 
  document.getElementById('build-menu').style.display = 'none';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('attack-btn').style.display = 'none';
  document.getElementById('shop-btn').style.display = 'none';
  document.getElementById('top-bar').style.display = 'none';
  document.getElementById('menu-btn').style.display = 'none';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('defense-ui').style.display = 'block';
  document.getElementById('defense-status').innerText = '🛡️ Obrona (Moździerz: Gotowy)';
  playSound('build'); game.scene.start('DefenseScene');
}

function endDefense(won) {
  const defenseScene = game.scene.getScene('DefenseScene');
  if (defenseScene) {
    const survivingBuildings = defenseScene.playerBuildings.filter(b => b.alive).map(b => ({ gridX: b.gridX, gridY: b.gridY, type: b.type, level: b.level, hp: b.hp, maxHp: b.maxHp, buildEndTime: b.buildEndTime }));
    let data = JSON.parse(localStorage.getItem('warBaseSave'));
    if (!data) data = { version: 34, gold: 3000, elixir: 1000, army: { barbarian: 0, archer: 0, giant: 0, wallbreaker: 0, hero: 0 }, troopLevels: { barbarian: 1, archer: 1, giant: 1 }, trophies: 0, xp: 0, level: 1, soundEnabled: true, lastDailyReward: 0, wins: 0, losses: 0, destroyedTotal: 0, quests: quests, buildings: [] };
    data.buildings = survivingBuildings;
    
    let trophiesChange = 0;
    if (won) { 
      data.gold += 300; data.elixir += 150; data.trophies += 2; trophiesChange = 2;
      data.xp += 150; if(data.xp >= data.level * 500) { data.xp -= data.level * 500; data.level++; } playSound('coin'); 
    } else {
      data.trophies = Math.max(0, data.trophies - 3); trophiesChange = -3;
    }
    localStorage.setItem('warBaseSave', JSON.stringify(data));
    
    document.getElementById('result-title').innerText = won ? "Baza Obroniona!" : "Splądrowano!";
    document.getElementById('result-title').style.color = won ? '#ffd700' : '#ff6666';
    for(let i = 1; i <= 3; i++) document.getElementById('star' + i).classList.remove('earned');
    document.getElementById('result-destroyed').innerText = won ? "Wróg odparty!" : "Wrogowie zniszczyli część bazy.";
    document.getElementById('result-gold').innerText = won ? "300" : "0";
    document.getElementById('result-elixir').innerText = won ? "150" : "0";
    document.getElementById('result-trophies').innerText = (trophiesChange > 0 ? '+' : '') + trophiesChange;
    document.getElementById('result-xp').innerText = won ? "150" : "0";
    document.getElementById('battle-result-overlay').style.display = 'flex';
  }
}

const config = {
  type: Phaser.CANVAS, 
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a1a',
  render: { clearBeforeRender: false },
  scene: [BaseScene, BattleScene, DefenseScene]
};
const game = new Phaser.Game(config);