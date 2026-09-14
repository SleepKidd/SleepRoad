'use strict';

(() => {
  if (typeof SleepRoad !== 'function') return;

  const proto = SleepRoad.prototype;
  const originalStartLevel = proto.startLevel;

  function ensureV3(game) {
    if (!Number.isFinite(game.playerContactZ)) game.playerContactZ = 18;
    if (!Array.isArray(game.fallen)) game.fallen = [];
    if (!Array.isArray(game.particles)) game.particles = [];
  }

  proto.resize = function resizeV3() {
    this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.w = Math.max(320, innerWidth);
    this.h = Math.max(500, innerHeight);
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    canvas.style.width = `${this.w}px`;
    canvas.style.height = `${this.h}px`;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const wide = this.w / this.h > .78;
    this.horizonY = this.h * (wide ? .16 : .19);
    this.bottomY = this.h * 1.06;
    this.roadBottomHalf = Math.min(this.w * .54, this.h * .42);
    this.roadHorizonHalf = Math.max(40, Math.min(72, this.w * .108));
    this._v3Geometry = `${this.w}x${this.h}`;
  };

  proto.ensureV3Geometry = function ensureV3Geometry() {
    ensureV3(this);
    const key = `${this.w}x${this.h}`;
    if (this._v3Geometry === key) return;
    const wide = this.w / this.h > .78;
    this.horizonY = this.h * (wide ? .16 : .19);
    this.bottomY = this.h * 1.06;
    this.roadBottomHalf = Math.min(this.w * .54, this.h * .42);
    this.roadHorizonHalf = Math.max(40, Math.min(72, this.w * .108));
    this._v3Geometry = key;
  };

  proto.startLevel = function startLevelV3(level) {
    ensureV3(this);
    this.playerContactZ = 18;
    this.fallen.length = 0;
    originalStartLevel.call(this, level);
  };

  proto.makeGatePair = function makeGatePairV3(rng, distance, section, level) {
    let a;
    let b;
    if (section < 2) {
      a = { op: 'mul', value: rng.pick([2, 2, 3]) };
      b = { op: 'add', value: rng.int(14 + level, 28 + level * 2) };
    } else {
      a = rng.next() < .5 ? { op: 'mul', value: rng.pick([2, 2, 3]) } : { op: 'add', value: rng.int(12 + level, 26 + level * 2) };
      b = rng.next() < .58 ? { op: 'add', value: rng.int(14, 34 + level) } : { op: 'mul', value: rng.pick([2, 3]) };
      if (rng.next() < .32) b = rng.next() < .65 ? { op: 'sub', value: rng.int(5, 14 + Math.floor(level * .45)) } : { op: 'div', value: 2 };
      if (a.op === b.op && a.value === b.value) b = a.op === 'mul' ? { op: 'add', value: rng.int(18, 38 + level) } : { op: 'mul', value: rng.pick([2, 3]) };
    }
    const pair = rng.next() < .5 ? [a, b] : [b, a];
    return { type: 'gate', distance, left: pair[0], right: pair[1], hit: false, phase: rng.range(0, TAU) };
  };

  proto.makeObstacle = function makeObstacleV3(rng, distance, difficulty, index) {
    const pool = difficulty < .32 ? ['spinner', 'pillars', 'spikes'] : difficulty < .7 ? ['spinner', 'pillars', 'spikes', 'saw', 'pusher'] : ['spinner', 'spikes', 'saw', 'pusher', 'pillars'];
    const kind = rng.pick(pool);
    if (kind === 'spinner') return { type: 'obstacle', kind, distance, x: 0, radius: .42, speed: rng.range(.72, 1.05), phase: rng.range(0, TAU), hit: false };
    if (kind === 'saw') return { type: 'obstacle', kind, distance, x: rng.pick([-.48, .48]), motion: rng.range(.22, .34), speed: rng.range(.82, 1.18), phase: rng.range(0, TAU), hit: false };
    if (kind === 'pusher') return { type: 'obstacle', kind, distance, side: rng.next() < .5 ? -1 : 1, phase: rng.range(0, TAU), speed: rng.range(.88, 1.18), hit: false };
    if (kind === 'spikes') return { type: 'obstacle', kind, distance, safeX: rng.pick([-.5, 0, .5]), hit: false };
    return { type: 'obstacle', kind: 'pillars', distance, gaps: [rng.pick([-.48, 0, .48])], hit: false, stagger: index % 2 === 0 };
  };

  proto.generateLevel = function generateLevelV3(level) {
    const rng = new RNG(0x51510000 + level * 104729);
    const difficulty = clamp((level - 1) / 22, 0, 1);
    const sections = 7 + Math.min(5, Math.floor(level / 3));
    const spacing = lerp(88, 76, difficulty);
    this.baseSpeed = lerp(23, 28, difficulty);
    this.speed = this.baseSpeed;
    this.levelLength = 120 + sections * spacing + 120;
    this.objects = [];
    let d = 95;

    for (let i = 0; i < sections; i++) {
      this.objects.push(this.makeGatePair(rng, d, i, level));
      this.addMoonPattern(rng, d + 22, i);
      if (i > 0 && rng.next() < .72) this.objects.push(this.makeObstacle(rng, d + 44, difficulty, i));
      if (i >= 2 && (i % 3 === 2 || rng.next() < .34)) {
        const base = 10 + level * .7 + i * 2.4;
        const count = Math.max(7, Math.round(base * rng.range(.72, 1.06)));
        this.objects.push({ type: 'enemy', distance: d + 67, x: rng.range(-.18, .18), count, maxCount: count, boss: level % 5 === 0 && i === sections - 2, hit: false, phase: rng.range(0, TAU) });
      }
      d += spacing + rng.range(-5, 6);
    }
    this.objects.push({ type: 'finish', distance: this.levelLength, hit: false });
    this.objects.sort((a, b) => a.distance - b.distance);
  };

  proto.crowdFormation = function crowdFormationV3(count = this.playerCount) {
    const n = Math.max(1, Math.min(180, Math.round(count)));
    const cols = Math.max(3, Math.ceil(Math.sqrt(n) * 1.15));
    const rows = Math.ceil(n / cols);
    const formation = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const rowCount = Math.min(cols, n - row * cols);
      const col = i % cols;
      const widthScale = Math.min(.115, .072 + Math.sqrt(n) * .0028);
      formation.push({ x: (col - (rowCount - 1) / 2) * widthScale, z: rows <= 1 ? 0 : row / (rows - 1), row, col });
    }
    return formation;
  };

  proto.obstacleCasualties = function obstacleCasualtiesV3(obj) {
    ensureV3(this);
    const units = this.crowdFormation(this.playerCount);
    let hits = 0;
    const spinnerAngle = this.time * (obj.speed || 1.3) + (obj.phase || 0);
    const sawX = (obj.x || 0) + Math.sin(this.time * (obj.speed || 1.4) + (obj.phase || 0)) * (obj.motion || 0);
    const pusherReach = .2 + (.5 + .5 * Math.sin(this.time * (obj.speed || 1.4) + (obj.phase || 0))) * .44;

    for (const unit of units) {
      const ux = clamp(this.playerX + unit.x, -.94, .94);
      const uy = (unit.z - .5) * .66;
      let hit = false;
      if (obj.kind === 'spinner') {
        const along = Math.cos(spinnerAngle) * ux + Math.sin(spinnerAngle) * uy;
        const dist = Math.abs(-Math.sin(spinnerAngle) * ux + Math.cos(spinnerAngle) * uy);
        hit = Math.abs(along) < .82 && dist < .095;
      } else if (obj.kind === 'saw') {
        hit = Math.abs(ux - sawX) < .16 + unit.z * .02;
      } else if (obj.kind === 'pusher') {
        const edge = .70 - pusherReach;
        hit = obj.side < 0 ? ux < -edge : ux > edge;
      } else if (obj.kind === 'spikes') {
        hit = Math.abs(ux - obj.safeX) > .25;
      } else if (obj.kind === 'pillars') {
        hit = !obj.gaps.some((gap) => Math.abs(ux - gap) < .18);
      }
      if (hit) hits++;
    }

    const severity = obj.kind === 'saw' ? .78 : obj.kind === 'spikes' ? .62 : obj.kind === 'spinner' ? .68 : .58;
    const actual = Math.round(hits * severity);
    if (actual > 0) return clamp(actual, 1, Math.max(1, this.playerCount - 1));
    if (obj.kind === 'saw' && Math.abs(this.playerX - sawX) < .26) return Math.min(this.playerCount, Math.max(2, Math.ceil(this.playerCount * .12)));
    if (obj.kind === 'spinner') {
      const centerDist = Math.abs(-Math.sin(spinnerAngle) * this.playerX);
      if (centerDist < .15) return Math.min(this.playerCount, Math.max(2, Math.ceil(this.playerCount * .10)));
    }
    if (obj.kind === 'spikes' && Math.abs(this.playerX - obj.safeX) > .28) return Math.min(this.playerCount, Math.max(3, Math.ceil(this.playerCount * .18)));
    return 0;
  };

  proto.spawnFallen = function spawnFallenV3(x, y, count) {
    ensureV3(this);
    const n = Math.min(14, Math.max(1, count));
    for (let i = 0; i < n; i++) {
      this.fallen.push({ x: x + rand(-28, 28), y: y + rand(-16, 12), vx: rand(-190, 190), vy: rand(-235, -90), g: rand(270, 410), rot: rand(-.5, .5), vr: rand(-8, 8), life: rand(.55, .9), max: .9, scale: rand(.72, 1.06) });
    }
  };

  proto.updateFallen = function updateFallenV3(dt) {
    ensureV3(this);
    for (const f of this.fallen) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; f.rot += f.vr * dt; }
    this.fallen = this.fallen.filter((f) => f.life > 0);
  };

  proto.applyObstacle = function applyObstacleV3(obj) {
    ensureV3(this);
    const loss = this.obstacleCasualties(obj);
    const anchor = this.project(this.playerX, this.playerContactZ, .02);
    if (loss <= 0) {
      this.burst(anchor.x, anchor.y + 8, 5, '#dad7ff');
      return;
    }
    this.playerCount = Math.max(0, this.playerCount - loss);
    this.setCount(this.playerCount, true);
    this.audio.hit();
    this.cameraShake = obj.kind === 'saw' || obj.kind === 'spinner' ? 10 : 8;
    this.flashScreen('255,84,112', .28);
    this.burst(anchor.x, anchor.y + 8, Math.min(44, 18 + loss * 2), '#ff6d82');
    this.spawnFallen(anchor.x, anchor.y + 8, loss);
    this.showToast(`−${loss} из толпы`, 850);
    if (this.playerCount <= 0) this.failLevel();
  };

  proto.update = function updateV3(dt) {
    ensureV3(this);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 24);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.updateParticles(dt);
    this.updateFallen(dt);
    if (this.state === 'menu') { this.travel = (this.travel + dt * 5.5) % 140; return; }
    if (this.state === 'finish') { this.updateFinish(dt); return; }
    if (this.state !== 'running') return;

    let move = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) move -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) move += 1;
    if (move) this.targetX = clamp(this.targetX + move * dt * 1.45, -.78, .78);
    this.playerX = lerp(this.playerX, this.targetX, 1 - Math.pow(.0008, dt));
    this.travel += this.speed * dt;
    this.visualCount = lerp(this.visualCount, this.playerCount, 1 - Math.pow(.015, dt));
    ui.progressFill.style.width = `${clamp(this.travel / this.levelLength * 100, 0, 100)}%`;

    for (const obj of this.objects) {
      if (obj.hit) continue;
      const rel = obj.distance - this.travel;
      if (obj.type === 'moon') {
        const pickupZ = this.playerContactZ + 4.2 * this.magnetScale();
        if (rel < pickupZ && rel > this.playerContactZ - 8 && Math.abs(this.playerX - obj.x) < .23 * this.magnetScale()) { obj.hit = true; this.collectMoon(obj); }
        continue;
      }
      const contact = this.playerContactZ;
      if (rel > contact + 1.8 || rel < contact - 4.5) continue;
      if (obj.type === 'gate') { obj.hit = true; this.applyGate(this.playerX < 0 ? obj.left : obj.right); }
      else if (obj.type === 'obstacle') { obj.hit = true; this.applyObstacle(obj); }
      else if (obj.type === 'enemy') { obj.hit = true; this.resolveEnemy(obj); }
      else if (obj.type === 'finish') { obj.hit = true; this.beginFinish(); break; }
    }
    if (this.playerCount <= 0) this.failLevel();
  };
})();