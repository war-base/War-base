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
let troopLevels = { barbarian: 1, archer