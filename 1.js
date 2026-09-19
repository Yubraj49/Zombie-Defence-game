const GAME_VERSION = "4.0";

const PATCH_NOTES = `
    <ul>
        <li><strong>NEW Campaign Screen:</strong> Unlock new maps each time you win!</li>
        <li><strong>NEW Map (incomplete):</strong> Introducing a new map 4, with new unique features, enemies and towers.</li>
        <li><strong>Wave Overhauls:</strong> Completely revamped wave structure and difficulty progression.</li>
        <li><strong>Towers Rebalanced:</strong> Smoother early-game difficulty curve.</li>
        <li><strong>Bug Fixes:</strong> Fixed Necromancer spawning logic and the game breaking after restarting after dying.</li>
    </ul>
`;

const AudioSys = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    enabled: true,
    muted: false,
    
    toggleMute: function() {
        this.muted = !this.muted;
        return this.muted;
    },

    playTone: function(freq, type, duration, vol=0.1) {
        if (!this.enabled || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playCharge: function() {
        if (!this.enabled || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime + 1);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    },

    playShoot: function(type) {
        if (!this.enabled || this.muted) return;
        if (type === 'rail') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.5);
        }
        else if (type === 'laser' || type === 'rail') this.playTone(800, 'sine', 0.1, 0.05);
        else if (type === 'mortar' || type === 'chemist') this.playTone(100, 'square', 0.3, 0.1);
        else if (type === 'buff') this.playTone(600, 'triangle', 0.5, 0.05); 
        else this.playTone(400, 'triangle', 0.1, 0.05); 
    },

    playExplosion: function() {
        if (!this.enabled || this.muted) return;
        this.playTone(50, 'sawtooth', 0.4, 0.15);
    }
};

function toggleSound() {
    const isMuted = AudioSys.toggleMute();
    const btn = document.getElementById('mute-btn');
    if (isMuted) {
        btn.innerText = "🔇";
        btn.style.opacity = "0.5";
    } else {
        btn.innerText = "🔊";
        btn.style.opacity = "1";
    }
}

const INTERNAL_WIDTH = 1280;
const INTERNAL_HEIGHT = 720;

const MAPS = {
    1: {
        name: "Grasslands",
        bgColor: "#27ae60",
        pathColor: "#5d4037",
        pathInner: "#795548",
        points: [
            {x: 0, y: 100}, {x: 300, y: 100}, {x: 300, y: 500},
            {x: 600, y: 500}, {x: 600, y: 200}, {x: 900, y: 200},
            {x: 900, y: 600}, {x: 1280, y: 600}
        ],
        towers: ['rifleman', 'sniper', 'mg', 'bombardier'],
        waves: 40
    },
    2: {
        name: "Haunted Cemetery",
        bgColor: "#1a1a1d", 
        pathColor: "#2c3e50", 
        pathInner: "#34495e", 
        points: [
            {x: 0, y: 360}, {x: 200, y: 360}, {x: 300, y: 100},
            {x: 600, y: 100}, {x: 700, y: 360}, {x: 900, y: 360},
            {x: 1000, y: 600}, {x: 1280, y: 600}
        ],
        towers: ['pyro', 'tesla', 'laser', 'mortar'],
        waves: 30
    },
    3: {
        name: "Secret Lab",
        bgColor: "#bdc3c7",
        pathColor: "#7f8c8d",
        pathInner: "#95a5a6", 
        points: [
            {x: 0, y: 150}, {x: 300, y: 150}, {x: 300, y: 600}, 
            {x: 500, y: 600},
            {x: 800, y: 100},
            {x: 800, y: 500}, {x: 1280, y: 500}
        ],
        teleporters: [{ entry: 3, exit: 4 }],
        towers: ['chemist', 'trumpeter', 'lab_laser', 'railgun'], 
        waves: 30
    },
    4: {
        name: "Dusty Canyon",
        bgColor: "#e67e22",
        pathColor: "#8d6e63",
        pathInner: "#a1887f",
        points: [
            {x: 0, y: 360}, {x: 1280, y: 360}
        ],
        towers: ['ricochet', 'demolitionist', 'subwoofer', 'gatling'],
        waves: 30
    }
};

// GLOBAL TOWER DEFINITIONS
const TOWER_TYPES = {
    // MAP 1
    rifleman: {
        name: "Rifleman", cost: 100, range: 150, damage: 10, fireRate: 40, color: '#3498db', projSpeed: 12, projType: 'bullet',
        upgrades: [
            { name: "Hollow Points", cost: 150, damage: 15, range: 160, desc: "+5 Dmg, +10 Rng" },
            { name: "Spec Ops", cost: 500, damage: 25, fireRate: 30, range: 180, desc: "Elite Rifleman" },
            { name: "Nanite Rounds", cost: 1400, damage: 50, range: 200, armorPierce: true, desc: "High tech destruction" }
        ]
    },
    sniper: {
        name: "Sniper", cost: 350, range: 315, damage: 40, fireRate: 180, color: '#27ae60', projSpeed: 30, projType: 'sniper',
        upgrades: [
            { name: "AP Rounds", cost: 450, damage: 60, fireRate: 120, armorPierce: true, desc: "Armour penetration + 1.5x speed" },
            { name: "50. Cal", cost: 700, damage: 100, range: 500, desc: "Massive Damage" },
            { name: "Thermal Optics", cost: 1800, damage: 225, range: 600, fireRate: 80, desc: "Never misses" }
        ]
    },
    mg: {
        name: "Gunner", cost: 400, range: 120, damage: 7, fireRate: 6, color: '#e67e22', projSpeed: 12, projType: 'bullet',
        upgrades: [
            { name: "Belt Fed", cost: 300, fireRate: 4, range: 130, desc: "Insane Fire Rate" },
            { name: "Minigun", cost: 800, fireRate: 2, desc: "Bullet Hose" },
            { name: "Laser Gatling", cost: 2100, damage: 12, fireRate: 1, desc: "Melts everything" }
        ]
    },
    bombardier: {
        name: "Bombardier", cost: 600, range: 200, damage: 30, fireRate: 150, color: '#8e44ad', projSpeed: 6, projType: 'bomb', aoe: 70, armorPierce: true,
        upgrades: [
            { name: "Big Bertha", cost: 400, aoe: 100, damage: 40, desc: "Larger Explosion" },
            { name: "Cluster Bombs", cost: 1100, damage: 70, fireRate: 90, desc: "Deadly Payload" },
            { name: "MOAB", cost: 2600, damage: 100, aoe: 140, fireRate: 120, desc: "Massive Ordnance" }
        ]
    },
    // MAP 2
    pyro: {
        name: "Pyro", cost: 350, range: 120, damage: 1.6, fireRate: 5, color: '#e74c3c', projSpeed: 15, projType: 'flame', armorPierce: false,
        upgrades: [
            { name: "Napalm", cost: 425, damage: 3, range: 140, desc: "Hotter flames" },
            { name: "Blue Fire", cost: 1000, damage: 6, fireRate: 4, armorPierce: true, desc: "Melts Armor" },
            { name: "Dragon's Breath", cost: 2400, damage: 10, range: 200, aoe: 50, desc: "Total Incineration" }
        ]
    },
    tesla: {
        name: "Tesla", cost: 500, range: 180, damage: 9, fireRate: 45, color: '#f1c40f', projSpeed: 0, projType: 'Lightning', chain: 2,
        upgrades: [
            { name: "High Voltage", cost: 650, damage: 20, chain: 3, desc: "+Dmg, +1 Chain" },
            { name: "Superconductor", cost: 1500, damage: 30, chain: 4, range: 220, desc: "+10dmg, +1 chain, +1.5x speed"},
            { name: "Storm Coil", cost: 3200, damage: 40, fireRate: 22, chain: 8, desc: "Chain Lightning storm" }
        ]
    },
    laser: {
        name: "Laser Trooper", cost: 650, range: 250, damage: 2, fireRate: 6, color: '#3498db', projSpeed: 99, projType: 'beam', rampSpeed: 0.45,
        upgrades: [
            { name: "Focus Lens", cost: 600, range: 300, rampSpeed: 0.9, desc: "Ramps 2x Faster" },
            { name: "Gamma Ray", cost: 1400, armorPierce: true, rampSpeed: 1.35, desc: "Pierces Armor & 3x Ramp" },
            { name: "Orbital Beam", cost: 3300, range: 800, rampSpeed: 2.25, desc: "Global Range & 5x Ramp"}
        ]
    },
    mortar: {
        name: "Mortar Team", cost:800, range: 500, damage: 100, fireRate: 300, color: '#7f8c8d', projSpeed: 5, projType: 'bomb', aoe: 40,
        upgrades: [
            { name: "Rapid Loader", cost: 850, fireRate: 240, desc: "Faster Reload" },
            { name: "Heavy Shells", cost: 2250, damage: 175, aoe: 60, desc: "1.75x Dmg & 1.5x AoE" },
            { name: "Nuke Shell", cost: 5000, range: 600, damage: 300, aoe: 160, desc: "Map wiper" }
        ]
    },
    chemist: {
        name: "Chemist", cost: 550, range: 150, damage: 5, fireRate: 180, color:'#009432', projSpeed: 8, projType: 'acid', aoe: 60, slow: 0.5,
        upgrades: [
            { name: "Corrosive", cost: 500, damage: 10, aoe: 80, desc: "Stronger Poison" },
            { name: "Sticky Goo", cost: 1500, damage: 15, fireRate: 120, slow: 0.4, desc: "Potent Mix" },
            { name: "Plague", cost: 3000, damage: 25, slow: 0.25, aoe: 150, desc; "Massive Infection" }
        ]         
    }, 
    trumpeter: {
        name: "Trumpeter", cost: 600, range: 100, damage: 0, fireRate: 60, color: '#f1c40f', projSpeed: 0, projType: 'buff',
        upgrades: [
            { name: "War Drums", cost: 500, desc: "+5 Dmg to nearby towers" },
            { name: "Acoustics", cost: 1000, desc: "+5 Dmg and +40 Range to nearby towers" },
            { name: "Piercing Note", cost: 2500, desc: "+5 Dmg and Grants Armor Piercing" }
        ]
    },
    lab_laser: {
        name: "Laser Trooper", cost: 450, range: 250, damage: 1, fireRate: 3, color: '#3498db', projSpeed: 99, projType: 'beam', rampSpeed: 0.6, buffEfficiency: 0.5,
        upgrades: [
            { name: "Focus Lens", cost: 650, fireRate: 300, rampSpeed: 1.2, desc: "Ramps 2x Faster",}
        ]
    }