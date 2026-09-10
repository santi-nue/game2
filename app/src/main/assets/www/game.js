// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
const GameState = {
  MENU: 0,
  PLAYING: 1,
  LEVEL_COMPLETE: 2
};

let currentState = GameState.MENU;
let currentLevel = 0;
let collectedShards = 0;
let totalShards = 0;
let gameTime = 0;

// UI Elements
const shardCountEl = document.getElementById('shardCount');
const levelNameEl = document.getElementById('levelName');
const messageEl = document.getElementById('message');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const abilityBtns = {
  burst: document.getElementById('btnBurst'),
  pull: document.getElementById('btnPull'),
  slow: document.getElementById('btnSlow')
};

// Particle System
class Particle {
  constructor(x, y, color, speed, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = speed * (0.5 + Math.random());
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.life = life;
    this.maxLife = life;
    this.size = 2 + Math.random() * 3;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    this.vy += 0.05; // gravity
  }
  
  draw() {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

let particles = [];

function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, 3 + Math.random() * 3, 30 + Math.random() * 20));
  }
}

// Player Class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 25;
    this.color = '#aef';
    this.speed = 6;
    this.targetX = x;
    this.targetY = y;
    this.abilities = {
      burst: { cooldown: 0, maxCooldown: 180 },
      pull: { cooldown: 0, maxCooldown: 240 },
      slow: { cooldown: 0, maxCooldown: 300 }
    };
    this.slowActive = false;
    this.slowTimer = 0;
  }
  
  update() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > this.speed) {
      const moveSpeed = this.slowActive ? this.speed * 0.5 : this.speed;
      this.x += (dx / dist) * moveSpeed;
      this.y += (dy / dist) * moveSpeed;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
    }
    
    // Cooldown management
    for (let key in this.abilities) {
      if (this.abilities[key].cooldown > 0) {
        this.abilities[key].cooldown--;
      }
    }
    
    // Slow effect timer
    if (this.slowActive) {
      this.slowTimer--;
      if (this.slowTimer <= 0) {
        this.slowActive = false;
      }
    }
    
    // Trail particles
    if (gameTime % 5 === 0 && dist > 10) {
      particles.push(new Particle(this.x, this.y, 'rgba(170, 238, 255, 0.5)', 1, 20));
    }
  }
  
  draw() {
    // Glow effect
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
    gradient.addColorStop(0, 'rgba(170, 238, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(170, 238, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Player body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // Inner glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  
  moveTo(x, y) {
    this.targetX = x;
    this.targetY = y;
  }
  
  useAbility(type) {
    if (this.abilities[type].cooldown > 0) return false;
    
    this.abilities[type].cooldown = this.abilities[type].maxCooldown;
    
    if (type === 'burst') {
      createParticles(this.x, this.y, '#aef', 30);
      // Reveal hidden elements (visual effect for now)
      showMessage("Light Burst!");
    } else if (type === 'pull') {
      // Attract shards
      levels[currentLevel].shards.forEach(shard => {
        if (!shard.collected) {
          const dx = this.x - shard.x;
          const dy = this.y - shard.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 300) {
            shard.x += dx * 0.1;
            shard.y += dy * 0.1;
          }
        }
      });
      createParticles(this.x, this.y, '#f0f', 25);
      showMessage("Crystal Pull!");
    } else if (type === 'slow') {
      this.slowActive = true;
      this.slowTimer = 180; // 3 seconds at 60fps
      createParticles(this.x, this.y, '#ff0', 20);
      showMessage("Time Slow!");
    }
    
    updateAbilityButtons();
    return true;
  }
}

// Crystal Shard Class
class CrystalShard {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.color = color;
    this.collected = false;
    this.floatOffset = Math.random() * Math.PI * 2;
    this.rotation = 0;
  }
  
  update(time, slowFactor = 1) {
    if (this.collected) return;
    this.y += Math.sin(time * 0.003 * slowFactor + this.floatOffset) * 0.5;
    this.rotation += 0.02 * slowFactor;
  }
  
  draw() {
    if (this.collected) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Draw crystal shape
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.7, -this.radius * 0.3);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(this.radius * 0.7, this.radius * 0.3);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius * 0.7, this.radius * 0.3);
    ctx.lineTo(-this.radius, 0);
    ctx.lineTo(-this.radius * 0.7, -this.radius * 0.3);
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.color);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.stroke();
    
    ctx.restore();
  }
}

// Portal Class
class Portal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 40;
    this.active = false;
    this.rotation = 0;
  }
  
  update(slowFactor = 1) {
    if (!this.active) return;
    this.rotation += 0.03 * slowFactor;
  }
  
  draw() {
    if (!this.active) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#aef';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner spiral
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -20, this.radius * 0.7, 0);
      ctx.strokeStyle = `rgba(170, 238, 255, ${0.5 + i * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Center glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.5);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(1, 'rgba(170, 238, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Level Data
const levels = [
  {
    name: "Whispering Woods",
    background: ["#0d2b1d", "#1a4a3a"],
    playerStart: { x: 100, y: 300 },
    shards: [
      { x: 300, y: 200, color: "#0f0" },
      { x: 500, y: 400, color: "#0f0" },
      { x: 200, y: 500, color: "#0f0" }
    ],
    portal: { x: 600, y: 300 }
  },
  {
    name: "Sunken Ruins",
    background: ["#0a1628", "#1a3a5a"],
    playerStart: { x: 150, y: 400 },
    shards: [
      { x: 400, y: 250, color: "#0af" },
      { x: 600, y: 350, color: "#0af" },
      { x: 300, y: 500, color: "#0af" },
      { x: 700, y: 450, color: "#0af" }
    ],
    portal: { x: 800, y: 300 }
  },
  {
    name: "Crystal Caverns",
    background: ["#1a0a28", "#3a1a5a"],
    playerStart: { x: 200, y: 350 },
    shards: [
      { x: 450, y: 200, color: "#f0f" },
      { x: 650, y: 300, color: "#f0f" },
      { x: 350, y: 450, color: "#f0f" },
      { x: 750, y: 400, color: "#f0f" },
      { x: 550, y: 500, color: "#f0f" }
    ],
    portal: { x: 900, y: 350 }
  }
];

let player;
let currentShards = [];
let portal;

// Initialize Level
function initLevel(levelIndex) {
  if (levelIndex >= levels.length) {
    showMessage("🎉 Quest Complete! 🎉");
    currentState = GameState.LEVEL_COMPLETE;
    setTimeout(() => {
      currentLevel = 0;
      initLevel(0);
      currentState = GameState.PLAYING;
    }, 3000);
    return;
  }
  
  const level = levels[levelIndex];
  player = new Player(level.playerStart.x, level.playerStart.y);
  currentShards = level.shards.map(s => new CrystalShard(s.x, s.y, s.color));
  portal = new Portal(level.portal.x, level.portal.y);
  portal.active = false;
  collectedShards = 0;
  totalShards = currentShards.length;
  updateUI();
  levelNameEl.textContent = level.name;
}

// Update UI
function updateUI() {
  shardCountEl.textContent = `💎 ${collectedShards}/${totalShards}`;
}

// Show Message
function showMessage(text) {
  messageEl.textContent = text;
  messageEl.style.opacity = 1;
  setTimeout(() => {
    messageEl.style.opacity = 0;
  }, 1500);
}

// Update Ability Buttons
function updateAbilityButtons() {
  for (let key in player.abilities) {
    const btn = abilityBtns[key];
    const ability = player.abilities[key];
    if (ability.cooldown > 0) {
      btn.classList.add('cooldown');
      btn.textContent = Math.ceil(ability.cooldown / 60);
    } else {
      btn.classList.remove('cooldown');
      btn.textContent = key.toUpperCase();
    }
  }
}

// Ability Button Listeners
abilityBtns.burst.addEventListener('click', () => player.useAbility('burst'));
abilityBtns.pull.addEventListener('click', () => player.useAbility('pull'));
abilityBtns.slow.addEventListener('click', () => player.useAbility('slow'));

// Touch/Mouse Input
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (currentState !== GameState.PLAYING) return;
  const touch = e.touches[0];
  player.moveTo(touch.clientX, touch.clientY);
});

canvas.addEventListener('mousedown', (e) => {
  if (currentState !== GameState.PLAYING) return;
  player.moveTo(e.clientX, e.clientY);
});

// Start Button
startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  currentState = GameState.PLAYING;
  initLevel(currentLevel);
});

// Background Drawing
function drawBackground() {
  const level = levels[currentLevel];
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, level.background[0]);
  gradient.addColorStop(1, level.background[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some decorative elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 50; i++) {
    const x = (Math.sin(i * 132.1) * 4321 + gameTime * 0.01) % canvas.width;
    const y = (Math.cos(i * 43.2) * 2341 + i * 10) % canvas.height;
    ctx.beginPath();
    ctx.arc(x < 0 ? x + canvas.width : x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Check Collisions
function checkCollisions() {
  // Shard collection
  currentShards.forEach(shard => {
    if (!shard.collected) {
      const dist = Math.hypot(player.x - shard.x, player.y - shard.y);
      if (dist < player.radius + shard.radius) {
        shard.collected = true;
        collectedShards++;
        createParticles(shard.x, shard.y, shard.color, 25);
        updateUI();
        
        if (collectedShards === totalShards) {
          portal.active = true;
          showMessage("Portal Activated!");
        }
      }
    }
  });
  
  // Portal entry
  if (portal.active) {
    const dist = Math.hypot(player.x - portal.x, player.y - portal.y);
    if (dist < player.radius + portal.radius * 0.5) {
      currentLevel++;
      initLevel(currentLevel);
    }
  }
}

// Main Game Loop
let lastTime = 0;
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  gameTime++;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (currentState === GameState.PLAYING) {
    drawBackground();
    
    const slowFactor = player.slowActive ? 0.5 : 1;
    
    // Update and draw shards
    currentShards.forEach(shard => {
      shard.update(timestamp, slowFactor);
      shard.draw();
    });
    
    // Update and draw portal
    portal.update(slowFactor);
    portal.draw();
    
    // Update and draw player
    player.update();
    player.draw();
    
    // Update particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    
    checkCollisions();
    updateAbilityButtons();
  }
  
  requestAnimationFrame(gameLoop);
}

// Start loop
requestAnimationFrame(gameLoop);
