// --- SYSTEM RANKINGU (Tabela Liderów) ---
// Generujemy stałą listę rywali (NPC), żeby gracz miał z kim rywalizować.

const RANKING_NAMES = [
    "MrocznyWędrowiec", "KrwawyBaron", "CieńNocy", "WładcaPustki", 
    "ŻelaznyWilk", "ZgubaSmoków", "Pogromca", "NiszczycielŚwiatów",
    "CichyZabójca", "PanCiemności", "OstatniRycerz", "WiecznyGłód"
];

let rivals = []; // Tablica na wygenerowanych przeciwników

// Funkcja generująca rywali (wywoływana raz przy starcie gry)
function generateRivals() {
    rivals = [];
    for (let i = 0; i < RANKING_NAMES.length; i++) {
        // Losujemy punkty dla rywali (od 0 do 1500)
        let randomTrophies = Phaser.Math.Between(0, 1500);
        rivals.push({
            name: RANKING_NAMES[i],
            trophies: randomTrophies,
            level: Math.max(1, Math.floor(randomTrophies / 100)) // Poziom zależny od czaszek
        });
    }
}

// Funkcja otwierająca ranking
function openRanking() {
    closeMainMenu(); // Zamykamy menu główne
    
    let listContainer = document.getElementById('ranking-list');
    listContainer.innerHTML = ''; // Czyszczenie listy

    // Tworzymy połączoną listę: Gracz + Rywale
    let allPlayers = [...rivals, { name: "Ty (Watażka)", trophies: trophies, level: level, isPlayer: true }];
    
    // Sortujemy malejąco po czaszkach
    allPlayers.sort((a, b) => b.trophies - a.trophies);

    // Renderowanie listy
    allPlayers.forEach((player, index) => {
        let place = index + 1;
        let rowClass = player.isPlayer ? 'ranking-row player-highlight' : 'ranking-row';
        let nameDisplay = player.isPlayer ? `<b>${player.name}</b>` : player.name;
        
        listContainer.innerHTML += `
            <div class="${rowClass}">
                <div class="rank-place">#${place}</div>
                <div class="rank-name">${nameDisplay} <span class="rank-level">(Ranga ${player.level})</span></div>
                <div class="rank-trophies">${player.trophies} 💀</div>
            </div>
        `;
    });

    document.getElementById('ranking-overlay').style.display = 'flex';
}

function closeRanking() {
    document.getElementById('ranking-overlay').style.display = 'none';
}