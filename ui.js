// --- KAMPANIA I POZIOMY ---
const CAMPAIGN_LEVELS = [
    { id: 1, name: "Wioska Goblinów", desc: "Łatwy łup. Słaba obrona.", icon: "👺", reqLevel: 1, lootG: 500, lootE: 200 },
    { id: 2, name: "Mroczna Puszcza", desc: "Średni poziom trudności.", icon: "🌲", reqLevel: 3, lootG: 1500, lootE: 800 },
    { id: 3, name: "Zamek Krwi", desc: "Potężny wróg. Wymagana silna armia.", icon: "🏰", reqLevel: 5, lootG: 5000, lootE: 2500 }
];

function openCampaignMap() {
    document.getElementById('campaign-map').style.display = 'flex';
    renderCampaignNodes();
}

function closeCampaignMap() {
    document.getElementById('campaign-map').style.display = 'none';
}

function renderCampaignNodes() {
    let container = document.getElementById('campaign-nodes-container');
    container.innerHTML = '';
    
    CAMPAIGN_LEVELS.forEach(level => {
        let isUnlocked = level.reqLevel <= level; // Poziom gracza
        let nodeClass = isUnlocked ? 'campaign-node' : 'campaign-node locked';
        
        container.innerHTML += `
            <div class="${nodeClass}" onclick="startCampaignLevel(${level.id})">
                <div class="node-info">
                    <div class="node-name">${level.name}</div>
                    <div class="node-desc">${level.desc} (Wymagany Poziom: ${level.reqLevel})</div>
                    <div class="node-desc" style="color:#ffd700;">Łup: ${level.lootG} 💰, ${level.lootE} 🔮</div>
                </div>
                <div class="node-icon">${level.icon}</div>
            </div>
        `;
    });
}

function startCampaignLevel(id) {
    let level = CAMPAIGN_LEVELS.find(l => l.id === id);
    if (!level) return;
    
    // Sprawdzenie, czy gracz ma wojsko
    if (getCurrentArmySize() <= 0 && army.hero <= 0) {
        showMessage('Brak wojska do ataku!', 'error');
        return;
    }

    // Ukrywamy mapę i przechodzimy do bitwy (na razie losowej, ale w przyszłości powiązanej z poziomem)
    closeCampaignMap();
    
    // Ustawiamy flagę, że to atak z kampanii
    window.isCampaignBattle = true;
    window.currentCampaignLoot = { gold: level.lootG, elixir: level.lootE };
    
    startAttack(); // Uruchamiamy standardową bitwę
}

// --- FUNKCJA AKTUALIZACJI INTERFEJSU ---
function updateUI() {
  document.getElementById('ui-gold').innerText = Math.floor(gold);
  document.getElementById('ui-elixir').innerText = Math.floor(elixir);
  document.getElementById('ui-trophies').innerText = trophies;
  document.getElementById('ui-level').innerText = level;

  const xpBarFill = document.getElementById('xp-bar-fill');
  if (xpBarFill) {
    let xpNeeded = level * 500;
    let xpPercent = (xp / xpNeeded) * 100;
    if (xpPercent > 100) xpPercent = 100;
    xpBarFill.style.width = xpPercent + '%';
  }

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
  if(document.getElementById('ui-wallbreaker')) document.getElementById('ui-wallbreaker').innerText = army.wallbreaker;
  
  if(document.getElementById('bp-army-capacity')) {
    document.getElementById('bp-army-capacity').innerText = `${getCurrentArmySize()} / ${getMaxArmy()}`;
  }

  updateAllianceUI();

  if(document.getElementById('army-bar-barbarian')) document.getElementById('army-bar-barbarian').innerText = army.barbarian;
  if(document.getElementById('army-bar-archer')) document.getElementById('army-bar-archer').innerText = army.archer;
  if(document.getElementById('army-bar-giant')) document.getElementById('army-bar-giant').innerText = army.giant;
  if(document.getElementById('army-bar-wallbreaker')) document.getElementById('army-bar-wallbreaker').innerText = army.wallbreaker;
}

function updateAllianceUI() {
  let allianceBtn = document.getElementById('alliance-btn');
  if (allianceBtn) {
    if (playerAlliance) {
      allianceBtn.innerHTML = `<span class="menu-icon">🛡️</span> Sojusz: ${playerAlliance}`;
    } else {
      allianceBtn.innerHTML = `<span class="menu-icon">🛡️</span> Sojusz (Brak)`;
    }
  }
}

// --- SYSTEM POWIADOMIEŃ (TOAST) ---
function showMessage(text, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(text); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = text;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function addXP(amount) {
  xp += amount;
  let xpNeeded = level * 500;
  if (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    showMessage(`Awans na Rangę ${level}!`, 'success');
  }
  updateUI();
}

// ... (RESZTA FUNKCJI UI.JS BEZ ZMIAN - SKLEP, ZADANIA, ITP.)
// Skopiuj je ze swojego starego pliku ui.js. 
// Poniżej dla pewności wklejam wszystkie potrzebne funkcje:

function checkHeroAvailability() {
  const hasAltar = buildings.some(b => b.type === 'altar');
  const heroBtn = document.getElementById('btn-troop-hero');
  if (!heroBtn) return;
  if (hasAltar && army.hero > 0) {
    heroBtn.classList.remove('disabled');
    document.getElementById('ui-hero').innerText = "Gotowy";
  } else {
    heroBtn.classList.add('disabled');
    document.getElementById('ui-hero').innerText = hasAltar ? "Ranny" : "Brak Ołtarza";
    if (selectedBattleTroopType === 'hero') selectBattleTroop('barbarian');
  }
}

function openMainMenu() { updateAllianceUI(); document.getElementById('main-menu-overlay').style.display = 'flex'; }
function closeMainMenu() { document.getElementById('main-menu-overlay').style.display = 'none'; }

function openProfile() {
  closeMainMenu();
  document.getElementById('profile-level').innerText = level;
  document.getElementById('profile-trophies').innerText = trophies;
  document.getElementById('profile-wins').innerText = wins;
  document.getElementById('profile-losses').innerText = losses;
  document.getElementById('profile-destroyed').innerText = destroyedTotal;
  document.getElementById('profile-overlay').style.display = 'flex';
}
function closeProfile() { document.getElementById('profile-overlay').style.display = 'none'; }

function openHelp() { closeMainMenu(); document.getElementById('help-overlay').style.display = 'flex'; }
function closeHelp() { document.getElementById('help-overlay').style.display = 'none'; }

function openSettings() { closeMainMenu(); document.getElementById('settings-overlay').style.display = 'flex'; updateSoundButton(); }
function closeSettings() { document.getElementById('settings-overlay').style.display = 'none'; }
function toggleSound() { soundEnabled = !soundEnabled; updateSoundButton(); saveGame(); }
function updateSoundButton() {
  const btn = document.getElementById('sound-toggle-btn');
  if (btn) {
    btn.innerText = soundEnabled ? '🔊 Dźwięk: Włączony' : '🔇 Dźwięk: Wyłączony';
    btn.style.background = soundEnabled ? '#4a5c38' : '#555';
  }
}

function openMail() { showMessage('Brak nowych wiadomości.', 'info'); }

function resetGame() {
  if (confirm("Zresetować twierdzę? Cały postęp przepadnie.")) {
    localStorage.removeItem('warBaseSave'); location.reload();
  }
}

function openBuildingPanel(building) {
  currentlySelectedBuilding = building;
  const def = BUILDINGS[building.type];
  document.getElementById('bp-name').innerText = def.name;
  document.getElementById('bp-level').innerText = building.level;
  
  document.getElementById('bp-status-text').innerHTML = `Produkcja: <span id="bp-prod">0</span>`;
  const prodGold = (def.prod.gold || 0) * building.level;
  const prodElixir = (def.prod.elixir || 0) * building.level;
  let prodStr = [];
  if (prodGold > 0) prodStr.push(prodGold + ' 💰');
  if (prodElixir > 0) prodStr.push(prodElixir + ' 🔮');
  document.getElementById('bp-prod').innerText = prodStr.join(' i ') || 'Brak';
  
  if (building.isBuilding) {
      document.getElementById('bp-upgrade').innerText = `W budowie...`;
      document.getElementById('bp-upgrade').disabled = true;
  } else {
      const upgradeCostGold = Math.floor(def.cost.gold * building.level * 1.5);
      const costElixir = Math.floor(def.cost.elixir * building.level * 1.5);
      document.getElementById('bp-upgrade').innerText = `Ulepsz (${upgradeCostGold} 💰, ${costElixir} 🔮)`;
      document.getElementById('bp-upgrade').disabled = false;
  }
  
  const sellValueGold = Math.floor(def.cost.gold * building.level * 0.5);
  const sellValueElixir = Math.floor(def.cost.elixir * building.level * 0.5);
  document.getElementById('bp-sell').innerText = `Zburz (+${sellValueGold} 💰, +${sellValueElixir} 🔮)`;
  
  document.getElementById('bp-upgrade').style.display = 'block';
  document.getElementById('bp-sell').style.display = 'block';

  if (building.type === 'barracks') { document.getElementById('bp-train-section').style.display = 'block'; updateUI(); } 
  else { document.getElementById('bp-train-section').style.display = 'none'; }
  if (building.type === 'lab') { document.getElementById('bp-lab-section').style.display = 'block'; updateLabUI(); } 
  else { document.getElementById('bp-lab-section').style.display = 'none'; }
  document.getElementById('building-panel').style.display = 'block';
}

function closeBuildingPanel() {
  document.getElementById('building-panel').style.display = 'none';
  currentlySelectedBuilding = null;
}

function updateLabUI() {
  ['barbarian', 'archer', 'giant'].forEach(type => {
    const lvl = troopLevels[type];
    const cost = Math.floor(BASE_TROOPS[type].cost * lvl * 2.5); 
    const btn = document.getElementById('lab-up-' + type);
    if(btn) btn.innerText = `Ulepsz ${BASE_TROOPS[type].name} L${lvl+1} (${cost} 🔮)`;
  });
}

function upgradeTroop(type) {
  const lvl = troopLevels[type];
  const cost = Math.floor(BASE_TROOPS[type].cost * lvl * 2.5);
  if (elixir < cost) { showMessage('Za mało Many!', 'error'); return; }
  elixir -= cost; troopLevels[type]++;
  playSound('build'); updateUI(); saveGame(); updateLabUI();
  showMessage(`Wyszkolono: ${BASE_TROOPS[type].name} (Lvl ${troopLevels[type]})!`, 'success');
}

function trainTroop(type) {
  const barracks = buildings.find(b => b.type === 'barracks');
  if (!barracks) { showMessage('Koszary są zniszczone!', 'error'); return; }
  if (getCurrentArmySize() >= getMaxArmy()) { showMessage('Brak miejsca w Obozach!', 'error'); return; }
  const cost = BASE_TROOPS[type].cost;
  if (elixir < cost) { showMessage('Za mało Many!', 'error'); return; }
  elixir -= cost; army[type]++;
  
  if (type === 'wallbreaker') updateQuest('train_wallbreaker', 1);
  else updateQuest('train_troop', 1);
  
  playSound('build'); updateUI(); saveGame();
}

function upgradeBuilding() {
  if (!currentlySelectedBuilding) return;
  if (currentlySelectedBuilding.isBuilding) { showMessage('Budynek jest już w budowie!', 'error'); return; }
  
  const def = BUILDINGS[currentlySelectedBuilding.type];
  const townhall = buildings.find(b => b.type === 'townhall');
  
  if (currentlySelectedBuilding.type !== 'townhall' && townhall && currentlySelectedBuilding.level >= townhall.level) {
    showMessage('Najpierw ulepsz Warownię!', 'error'); return;
  }
  
  const costGold = Math.floor(def.cost.gold * currentlySelectedBuilding.level * 1.5);
  const costElixir = Math.floor(def.cost.elixir * currentlySelectedBuilding.level * 1.5);
  
  if (gold < costGold) { showMessage('Za mało złota!', 'error'); return; }
  if (elixir < costElixir) { showMessage('Za mało Many!', 'error'); return; }
  
  gold -= costGold; elixir -= costElixir;
  let buildTime = 15000; 
  currentlySelectedBuilding.isBuilding = true;
  currentlySelectedBuilding.buildEndTime = Date.now() + buildTime;
  
  const defBuilding = BUILDINGS[currentlySelectedBuilding.type];
  let oldGridX = currentlySelectedBuilding.gridX; let oldGridY = currentlySelectedBuilding.gridY;
  let oldLevel = currentlySelectedBuilding.level;
  
  buildings = buildings.filter(b => b !== currentlySelectedBuilding);
  if (currentlySelectedBuilding.label) currentlySelectedBuilding.label.destroy();
  if (currentlySelectedBuilding.hpBar) currentlySelectedBuilding.hpBar.destroy();
  currentlySelectedBuilding.destroy();
  
  baseSceneInstance.createBuilding(oldGridX, oldGridY, currentlySelectedBuilding.type, false, oldLevel, null, true, currentlySelectedBuilding.buildEndTime);
  
  playSound('build'); updateUI(); saveGame(); closeBuildingPanel();
}

function sellBuilding() {
  if (!currentlySelectedBuilding) return;
  if (currentlySelectedBuilding.isBuilding) { showMessage('Nie można zburzyć budynku w budowie!', 'error'); return; }
  const def = BUILDINGS[currentlySelectedBuilding.type];
  gold += Math.floor(def.cost.gold * currentlySelectedBuilding.level * 0.5);
  elixir += Math.floor(def.cost.elixir * currentlySelectedBuilding.level * 0.5);
  
  if (currentlySelectedBuilding.sprite) currentlySelectedBuilding.sprite.destroy();
  if (currentlySelectedBuilding.label) currentlySelectedBuilding.label.destroy();
  if (currentlySelectedBuilding.hpBar) currentlySelectedBuilding.hpBar.destroy();
  
  buildings = buildings.filter(b => b !== currentlySelectedBuilding);
  updateUI(); saveGame(); closeBuildingPanel();
}

function updateQuest(type, amount = 1) {
  let questUpdated = false;
  quests.forEach(q => {
    if (q.type === type && q.current < q.target && !q.claimed) {
      q.current += amount;
      if (q.current > q.target) q.current = q.target;
      questUpdated = true;
    }
  });
  if (questUpdated) {
    saveGame();
    if (document.getElementById('quests-overlay').style.display === 'flex') renderQuests();
  }
}
function openQuests() { closeMainMenu(); renderQuests(); document.getElementById('quests-overlay').style.display = 'flex'; }
function closeQuests() { document.getElementById('quests-overlay').style.display = 'none'; }
function renderQuests() {
  let listEl = document.getElementById('quest-list'); listEl.innerHTML = '';
  quests.forEach(q => {
    let isComplete = q.current >= q.target;
    let btnText = q.claimed ? 'Odebrano' : (isComplete ? 'Odbierz' : 'W toku');
    let btnClass = q.claimed ? 'quest-btn claimed' : (isComplete ? 'quest-btn ready' : 'quest-btn');
    let action = isComplete && !q.claimed ? `onclick="claimQuest('${q.id}')"` : '';
    let rewardStr = [];
    if(q.reward.gold > 0) rewardStr.push(`💰 ${q.reward.gold}`);
    if(q.reward.elixir > 0) rewardStr.push(`🔮 ${q.reward.elixir}`);
    if(q.reward.xp > 0) rewardStr.push(`🌟 ${q.reward.xp} XP`);

    listEl.innerHTML += `<div class="quest-item" style="${q.claimed ? 'opacity:0.5;' : ''}"><div class="quest-info"><div class="quest-title">${q.title}</div><div class="quest-progress">${q.desc} (${q.current}/${q.target})</div><div class="quest-progress" style="color:#c9a06c; margin-top:3px;">Nagroda: ${rewardStr.join(', ')}</div></div><button class="${btnClass}" ${action}>${btnText}</button></div>`;
  });
}
function claimQuest(id) {
  let q = quests.find(x => x.id === id);
  if (q && q.current >= q.target && !q.claimed) {
    q.claimed = true; gold += q.reward.gold; elixir += q.reward.elixir; addXP(q.reward.xp); playSound('coin');
    updateUI(); saveGame(); renderQuests(); showMessage('Odebrano nagrodę!', 'success');
  }
}

function openShop() { closeMainMenu(); document.getElementById('shop-overlay').style.display = 'flex'; }
function closeShop() { document.getElementById('shop-overlay').style.display = 'none'; }
function buyGoldWithMana() { if (elixir >= 500) { elixir -= 500; gold += 1000; playSound('coin'); updateUI(); saveGame(); showMessage('Kupiono 1000 złota!', 'success'); } else { showMessage('Za mało Many!', 'error'); } }
function buyManaWithGold() { if (gold >= 1000) { gold -= 1000; elixir += 500; playSound('coin'); updateUI(); saveGame(); showMessage('Kupiono 500 Many!', 'success'); } else { showMessage('Za mało złota!', 'error'); } }
let chestLoot = { gold: 0, elixir: 0 };
function buyChest(cost, type) { if (gold >= cost) { gold -= cost; playSound('build'); updateUI(); saveGame(); openChest(type); } else { showMessage('Za mało złota!', 'error'); } }
function openChest(type) {
  let title = "Drewniana Skrzynia"; let icon = "📦"; let rewardGold = 0; let rewardElixir = 0;
  if (type === 'wood') { title = "Drewniana Skrzynia"; icon = "📦"; rewardGold = Phaser.Math.Between(300, 800); rewardElixir = Phaser.Math.Between(100, 400); }
  else if (type === 'silver') { title = "Srebrna Skrzynia"; icon = "🎁"; rewardGold = Phaser.Math.Between(1500, 3000); rewardElixir = Phaser.Math.Between(800, 1500); }
  chestLoot.gold = rewardGold; chestLoot.elixir = rewardElixir;
  document.getElementById('chest-title').innerText = title;
  document.getElementById('chest-icon').innerText = icon;
  document.getElementById('chest-loot-display').innerHTML = `<div>💰 +${rewardGold}</div><div>🔮 +${rewardElixir}</div>`;
  document.getElementById('chest-overlay').style.display = 'flex'; playSound('coin');
}
function closeChest() { gold += chestLoot.gold; elixir += chestLoot.elixir; updateUI(); saveGame(); document.getElementById('chest-overlay').style.display = 'none'; showMessage('Odebrano łup ze skrzyni!', 'success'); }

function openDailyReward() {
  closeMainMenu();
  let now = Date.now(); let timePassed = now - lastDailyReward; let cooldown = 24 * 60 * 60 * 1000;
  if (timePassed >= cooldown) {
    let rewardGold = 1000; let rewardElixir = 500;
    gold += rewardGold; elixir += rewardElixir; lastDailyReward = now;
    playSound('coin'); updateUI(); saveGame(); updateDailyButtonState();
    showMessage(`Odebrano codzienną nagrodę: ${rewardGold} 💰 i ${rewardElixir} 🔮!`, 'success');
  } else {
    let msLeft = cooldown - timePassed; let hoursLeft = Math.floor(msLeft / (60 * 60 * 1000)); let minsLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
    showMessage(`Nagroda dostępna za ${hoursLeft}h ${minsLeft}m.`, 'info');
  }
}
function updateDailyButtonState() {
  let btn = document.getElementById('daily-btn'); if (!btn) return;
  let now = Date.now(); let cooldown = 24 * 60 * 60 * 1000;
  if (now - lastDailyReward >= cooldown) btn.classList.add('available'); else btn.classList.remove('available');
}