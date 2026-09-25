'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const FEATURE_DURATION = 5;

// ── Skins ──────────────────────────────────────────────────────────────────────
const SKINS = [
  { name: 'CLASICA', hull: '#ffffff', accent: '#bde0fe', flame: '#ff8200', boost: '#6496ff' },
  { name: 'NEON', hull: '#5ee7ff', accent: '#ff4fd8', flame: '#ff4fd8', boost: '#5ee7ff' },
  { name: 'SOLAR', hull: '#ffd166', accent: '#fff3b0', flame: '#ff9f1c', boost: '#ffd166' },
  { name: 'CROMO', hull: '#d8dee9', accent: '#7dd3fc', flame: '#38bdf8', boost: '#a5b4fc' },
  { name: 'ROJA', hull: '#ff2020', accent: '#ff8080', flame: '#ff4040', boost: '#ff4040', scale: 2, points: 2 },
];
const SKIN_STORAGE_KEY = 'asteroids-skin';
let currentSkinIndex = 0;

function loadSkin() {
  try {
    const saved = Number.parseInt(localStorage.getItem(SKIN_STORAGE_KEY), 10);
    if (Number.isInteger(saved) && saved >= 0 && saved < SKINS.length)
      currentSkinIndex = saved;
  } catch (error) {
    // El juego funciona aunque el navegador bloquee localStorage.
  }
}

function currentSkin() {
  return SKINS[currentSkinIndex];
}

function skinScale() {
  return currentSkin().scale || 1;
}

function scoreMultiplier() {
  return currentSkin().points || 1;
}

function changeSkin(step) {
  currentSkinIndex = (currentSkinIndex + step + SKINS.length) % SKINS.length;
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, String(currentSkinIndex));
  } catch (error) {
    // La selección sigue activa durante esta partida.
  }
}

loadSkin();

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Proyectil enemigo ──────────────────────────────────────────────────────────
class EnemyBullet extends Bullet {
  constructor(x, y, angle) {
    super(x, y, angle);
    const SPEED = 190;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 4;
    this.radius = 3;
  }

  draw() {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Asteroide estrella fugaz ───────────────────────────────────────────────────
class ShootingStarAsteroid extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    const speed = rand(230, 300);
    const angle = Math.atan2(this.vy, this.vx);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = rand(4, 7);
    this.expired = false;
    this.points = 150;
    this.trail = [];
    this.shootCooldown = rand(1.5, 3.5);
  }

  update(dt) {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 9) this.trail.pop();
    super.update(dt);
    this.shootCooldown -= dt;
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      this.expired = true;
    }
  }

  split() {
    return [];
  }

  draw() {
    ctx.save();

    // Estela decreciente en la dirección opuesta al movimiento.
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const alpha = (1 - i / this.trail.length) * 0.55;
      ctx.strokeStyle = `rgba(255, 190, 70, ${alpha.toFixed(2)})`;
      ctx.lineWidth = Math.max(1, 3 - i * 0.25);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x - this.vx * 0.035, point.y - this.vy * 0.035);
      ctx.stroke();
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * skinScale();
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.speedBoost    = 0; // seconds of speed boost remaining
    this.tripleShot    = 0; // seconds of triple shot remaining
    this.shieldTime    = 0;
  }

  update(dt) {
    if (this.dead) return;
    this.radius = 12 * skinScale();
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost = Math.max(0, this.speedBoost - dt);
    if (this.tripleShot    > 0) this.tripleShot = Math.max(0, this.tripleShot - dt);

    if (this.shieldTime > 0) this.shieldTime = Math.max(0, this.shieldTime - dt);

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      // Apply speed boost multiplier
      const speedMultiplier = this.speedBoost > 0 ? 2 : 1;
      this.vx += Math.cos(this.angle) * THRUST * dt * speedMultiplier;
      this.vy += Math.sin(this.angle) *THRUST * dt * speedMultiplier;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * skinScale();
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      const spread = 0.2;
      return [
        new Bullet(ox, oy, this.angle - spread),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + spread),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    if (this.shieldTime > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = Math.sin(performance.now() * 0.01) * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 9 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80, 190, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 210, 255, 0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(skinScale(), skinScale());
    const skin = currentSkin();
    ctx.strokeStyle = skin.hull;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.fillStyle = `${skin.hull}18`;
    ctx.fill();
    ctx.stroke();

    // Cabina de color para distinguir visualmente cada skin.
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-3, -3.5);
    ctx.lineTo(-3, 3.5);
    ctx.closePath();
    ctx.fillStyle = skin.accent;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }
    
    // Speed boost indicator
    if (this.speedBoost > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius / skinScale() + 5, 0, Math.PI * 2);
      ctx.strokeStyle = skin.boost;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this.tripleShot > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius / skinScale() + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 210, 70, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.ttl = 10; // seconds before despawning
    this.dead = false;
    this.type = type;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const color = this.type === 'tripleShot'
      ? '#ffd246'
      : this.type === 'shield' ? '#64d2ff' : '#6496ff';

    // Draw a colored circle with glow effect
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Outer glow
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + 4);
    const glowColor = this.type === 'tripleShot'
      ? 'rgba(255, 210, 70, 0.8)'
      : this.type === 'shield' ? 'rgba(100, 210, 255, 0.8)' : 'rgba(100, 150, 255, 0.8)';
    const transparentGlow = glowColor.replace('0.8', '0');
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, transparentGlow);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Main circle
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (this.type === 'tripleShot') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      for (const y of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(-4, y);
        ctx.lineTo(4, y);
        ctx.stroke();
      }
    }
    
    // Inner highlight
    ctx.beginPath();
    ctx.arc(-this.radius/3, -this.radius/3, this.radius/3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    if (this.type === 'shield') {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 3, Math.PI * 0.2, Math.PI * 0.8);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, enemyBullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingStarSpawned;
let shootingStarTimer;

function scheduleShootingStar() {
  shootingStarSpawned = false;
  shootingStarTimer = rand(2, 7);
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  asteroids.push(new ShootingStarAsteroid(x, y));
  shootingStarSpawned = true;
}

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  enemyBullets = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
  scheduleShootingStar();
}

function nextLevel() {
  level++;
  bullets   = [];
  enemyBullets = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
  scheduleShootingStar();
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyQ')) changeSkin(-1);
  if (pressed('KeyE')) changeSkin(1);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    enemyBullets.forEach(b => b.update(dt));
    particles = particles.filter(p => !p.dead);
    enemyBullets = enemyBullets.filter(b => !b.dead);
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    enemyBullets.forEach(b => b.update(dt));
    particles = particles.filter(p => !p.dead);
    enemyBullets = enemyBullets.filter(b => !b.dead);
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids.forEach(a => {
      if (a.expired) {
        explode(a.x, a.y, 5);
        a.expired = false;
      }
    });
    asteroids = asteroids.filter(a => !a.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  enemyBullets.forEach(b => b.update(dt));
  if (!shootingStarSpawned) {
    shootingStarTimer -= dt;
    if (shootingStarTimer <= 0) spawnShootingStar();
  }
  asteroids.forEach(a => a.update(dt));
  for (const a of asteroids) {
    if (a instanceof ShootingStarAsteroid && !a.dead && a.shootCooldown <= 0) {
      const angle = Math.atan2(ship.y - a.y, ship.x - a.x);
      enemyBullets.push(new EnemyBullet(a.x, a.y, angle));
      a.shootCooldown = rand(2.5, 4.5);
    }
  }
  asteroids.forEach(a => {
    if (a.expired) {
      explode(a.x, a.y, 5);
      a.expired = false;
    }
  });
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  enemyBullets = enemyBullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += (a.points || POINTS[a.size]) * scoreMultiplier();
        explode(a.x, a.y, a.size * 5);
        // Spawn a power-up with 20% chance when an asteroid is destroyed.
        if (Math.random() < 0.2) {
          const types = ['speed', 'tripleShot', 'shield'];
          const type = types[Math.floor(Math.random() * types.length)];
          powerups.push(new PowerUp(a.x, a.y, type));
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Escudo y proyectiles enemigos
  for (const b of enemyBullets) {
    if (ship.dead) break;
    if (b.dead) continue;
    if (ship.shieldTime > 0 && dist(ship, b) < ship.radius + 9) {
      b.dead = true;
      explode(b.x, b.y, 4);
    } else if (ship.invincible <= 0 && dist(ship, b) < ship.radius + b.radius) {
      b.dead = true;
      killShip();
      break;
    }
  }
  enemyBullets = enemyBullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'tripleShot') {
        ship.tripleShot = FEATURE_DURATION;
      } else if (p.type === 'shield') {
        ship.shieldTime = FEATURE_DURATION;
      } else {
        ship.speedBoost = FEATURE_DURATION;
      }
    }
  }

  // Garantizar una estrella fugaz antes de completar el nivel.
  if (asteroids.length === 0) {
    if (!shootingStarSpawned) {
      spawnShootingStar();
    } else {
      nextLevel();
    }
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = currentSkin();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.hull;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  const skin = currentSkin();
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  const features = [
    { name: 'SPEED BOOST', time: ship.speedBoost, color: skin.boost },
    { name: 'TRIPLE SHOT', time: ship.tripleShot, color: '#ffd246' },
    { name: 'SHIELD', time: ship.shieldTime, color: '#64d2ff' },
  ].filter(feature => feature.time > 0);

  features.forEach((feature, index) => {
    const y = 48 + index * 34;
    const time = Math.max(0, feature.time);
    const progress = Math.max(0, Math.min(1, time / FEATURE_DURATION));
    const barWidth = 180;
    const barHeight = 8;

    ctx.fillStyle = feature.color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${feature.name} ${time.toFixed(1)}s`, 14, y);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(14, y + 7, barWidth, barHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, y + 7, barWidth, barHeight);
    ctx.fillStyle = feature.color;
    ctx.fillRect(15, y + 8, (barWidth - 2) * progress, barHeight - 2);
  });

  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  ctx.fillStyle = skin.hull;
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  const multiplier = scoreMultiplier();
  ctx.fillText(multiplier > 1
    ? `SKIN ${skin.name}  x${multiplier} PTS  [Q/E]`
    : `SKIN ${skin.name}  [Q/E]`, W - 14, 66);
  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
