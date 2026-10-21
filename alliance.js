// --- SYSTEM SOJUSZY ---
const ALLIANCE_NAMES = ["Cienie Nocy", "Żelazna Krucjata", "Synowie Ognia", "Zakon Krwi"];
let playerAlliance = null; // Tutaj zapiszemy nazwę sojuszu gracza

function openAllianceMenu() {
    closeMainMenu();
    let content = document.getElementById('alliance-content');
    
    if (playerAlliance) {
        // Jeśli gracz jest w sojuszu
        content.innerHTML = `
            <p style="color:#88ff88; font-size:20px; margin-bottom:20px;">Należysz do sojuszu:<br><b>${playerAlliance}</b></p>
            <p style="font-size:14px; color:#aaa; margin-bottom:20px;">Bonus: +10% do produkcji surowców</p>
            <button class="close-modal" style="background:#8b0000;" onclick="leaveAlliance()">Opuść sojusz</button>
            <button class="close-modal" onclick="closeAlliance()">Zamknij</button>
        `;
    } else {
        // Jeśli gracz nie ma sojuszu
        let optionsHTML = ALLIANCE_NAMES.map(name => `<button class="menu-btn-item" onclick="joinAlliance('${name}')"><span class="menu-icon">🛡️</span> Dołącz do: ${name}</button>`).join('');
        content.innerHTML = `
            <p style="margin-bottom:20px;">Nie należysz do żadnego sojuszu. Dołączenie daje +10% do produkcji surowców!</p>
            ${optionsHTML}
            <button class="close-modal" style="background:#4a5c38;" onclick="createAlliance()">Załóż własny sojusz (Koszt: 1000 💰)</button>
            <button class="close-modal" onclick="closeAlliance()">Zamknij</button>
        `;
    }
    document.getElementById('alliance-overlay').style.display = 'flex';
}

function closeAlliance() {
    document.getElementById('alliance-overlay').style.display = 'none';
}

function joinAlliance(name) {
    playerAlliance = name;
    saveGame(); // Zapisujemy stan
    openAllianceMenu(); // Odświeżamy okno
}

function leaveAlliance() {
    playerAlliance = null;
    saveGame();
    openAllianceMenu();
}

function createAlliance() {
    if (gold < 1000) { alert("Za mało złota!"); return; }
    let name = prompt("Podaj nazwę swojego sojuszu (max 15 znaków):");
    if (name && name.trim().length > 0) {
        gold -= 1000;
        playerAlliance = name.trim().substring(0, 15);
        updateUI();
        saveGame();
        openAllianceMenu();
    }
}