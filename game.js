'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const $ = (id) => document.getElementById(id);

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

const ui = {
  hud: $('hud'), menu: $('menu'), result: $('result'), playBtn: $('playBtn'), nextBtn: $('nextBtn'), retryBtn: $('retryBtn'), soundBtn: $('soundBtn'),
  levelValue: $('levelValue'), moonValue: $('moonValue'), menuMoonValue: $('menuMoonValue'), menuLevelValue: $('menuLevelValue'), progressFill: $('progressFill'),
  countBadge: $('countBadge'), countValue: $('countValue'), resultKicker: $('resultKicker'), resultTitle: $('resultTitle'), resultCount: $('resultCount'),
  resultMoons: $('resultMoons'), resultMultiplier: $('resultMultiplier'), toast: $('toast'),
  upgradeCrowd: $('upgradeCrowd'), upgradeMagnet: $('upgradeMagnet'), upgradeIncome: $('upgradeIncome'),
  crowdUpgradeText: $('crowdUpgradeText'), magnetUpgradeText: $('magnetUpgradeText'), incomeUpgradeText: $('incomeUpgradeText'),
  crowdUpgradeCost: $('crowdUpgradeCost'), magnetUpgradeCost: $('magnetUpgradeCost'), incomeUpgradeCost: $('incomeUpgradeCost')
};

const SAVE_KEY = 'sleep-road-save-v2';
const DEFAULT_SAVE = { level: 1, moons: 0, sound: true, upgrades: { crowd: 0, magnet: 0, income: 0 } };
const UPGRADE_MAX = { crowd: 12, magnet: 10, income: 10 };

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const data = JSON.parse(raw);
    return {
      level: Math.max(1, Math.floor(safeNumber(data.level, 1))),
      moons: Math.max(0, Math.floor(safeNumber(data.moons, 0))),
      sound: data.sound !== false,
      upgrades: {
        crowd: clamp(Math.floor(safeNumber(data.upgrades?.crowd, 0)), 0, UPGRADE_MAX.crowd),
        magnet: clamp(Math.floor(safeNumber(data.upgrades?.magnet, 0)), 0, UPGRADE_MAX.magnet),
        income: clamp(Math.floor(safeNumber(data.upgrades?.income, 0)), 0, UPGRADE_MAX.income)
      }
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

class RNG {
  constructor(seed) { this.seed = (seed >>> 0) || 1; }
  next() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}

class AudioEngine {
  constructor(enabled) { this.enabled = enabled; this.ac = null; this.master = null; }
  ensure() {
    if (!this.enabled) return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ac) {
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.11;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    return true;
  }
  tone(freq, duration, type = 'sine', gain = 0.05, slide = 1) {
    if (!this.ensure()) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const amp = this.ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp); amp.connect(this.master); osc.start(t); osc.stop(t + duration + 0.03);
  }
  coin() { this.tone(880, .08, 'sine', .055, 1.25); }
  good() { this.tone(430, .08, 'triangle', .06, 1.55); setTimeout(() => this.tone(720, .10, 'sine', .05, 1.18), 55); }
  bad() { this.tone(180, .14, 'sawtooth', .05, .7); }
  hit() { this.tone(120, .10, 'square', .04, .55); }
  win() { this.tone(420, .13, 'triangle', .06, 1.4); setTimeout(() => this.tone(650, .16, 'triangle', .06, 1.28), 110); setTimeout(() => this.tone(860, .24, 'sine', .055, 1.1), 240); }
  fail() { this.tone(220, .32, 'triangle', .06, .48); }
}

class SleepRoad {
  constructor() {
    this.save = loadSave();
    this.audio = new AudioEngine(this.save.sound);
    this.state = 'menu';
    this.w = 390; this.h = 844; this.dpr = 1;
    this.horizonY = 220; this.bottomY = 900; this.roadBottomHalf = 330; this.roadHorizonHalf = 44; this.viewDistance = 150;
    this.level = this.save.level; this.travel = 0; this.levelLength = 820; this.speed = 24; this.baseSpeed = 24;
    this.playerX = 0; this.targetX = 0; this.playerCount = 8; this.visualCount = 8; this.objects = []; this.particles = [];
    this.pointer = { down: false, startX: 0, startPlayerX: 0 };
    this.keys = new Set(); this.last = performance.now(); this.time = 0; this.cameraShake = 0; this.flash = 0; this.flashColor = '255,255,255';
    this.levelMoons = 0; this.finishMultiplier = 1; this.finishTimer = 0; this.finishStep = 0; this.resultTimer = null; this.toastTimer = null;
    this.islandSeed = Array.from({ length: 12 }, (_, i) => ({ side: i % 2 ? 1 : -1, y: .22 + ((i * .071) % .58), size: .55 + ((i * .13) % .8), phase: i * .73 }));
    this.stars = Array.from({ length: 85 }, (_, i) => ({ x: ((i * 0.6180339887) % 1), y: .025 + ((i * .271828) % .58), r: .45 + ((i * .17) % 1.5), p: i * .81 }));
    this.bind(); this.resize(); this.refreshMenu(); requestAnimationFrame((t) => this.loop(t));
  }

  startCount() { return 8 + this.save.upgrades.crowd * 2; }
  magnetScale() { return 1 + this.save.upgrades.magnet * .13; }
  incomeScale() { return 1 + this.save.upgrades.income * .12; }
  upgradeCost(type) {
    const level = this.save.upgrades[type];
    const base = type === 'crowd' ? 40 : type === 'magnet' ? 55 : 70;
    return Math.round(base * Math.pow(1.48, level) / 5) * 5;
  }

  bind() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120), { passive: true });
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });

    const pointerDown = (e) => {
      if (this.state !== 'running') return;
      this.pointer.down = true; this.pointer.startX = e.clientX; this.pointer.startPlayerX = this.targetX;
      try { canvas.setPointerCapture?.(e.pointerId); } catch {}
    };
    const pointerMove = (e) => {
      if (!this.pointer.down || this.state !== 'running') return;
      const dx = e.clientX - this.pointer.startX;
      this.targetX = clamp(this.pointer.startPlayerX + dx / Math.max(240, this.w) * 1.8, -.78, .78);
    };
    const pointerUp = () => { this.pointer.down = false; };
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp);
    window.addEventListener('keydown', (e) => { if (['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)) e.preventDefault(); this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    ui.playBtn.addEventListener('click', () => { this.audio.ensure(); this.startLevel(this.save.level); });
    ui.nextBtn.addEventListener('click', () => { this.audio.ensure(); this.startLevel(this.save.level); });
    ui.retryBtn.addEventListener('click', () => { this.audio.ensure(); this.startLevel(this.level); });
    ui.soundBtn.addEventListener('click', () => { this.save.sound = !this.save.sound; this.audio.enabled = this.save.sound; if (this.save.sound) this.audio.ensure(); writeSave(this.save); this.refreshMenu(); });
    ui.upgradeCrowd.addEventListener('click', () => this.buyUpgrade('crowd'));
    ui.upgradeMagnet.addEventListener('click', () => this.buyUpgrade('magnet'));
    ui.upgradeIncome.addEventListener('click', () => this.buyUpgrade('income'));
  }

  buyUpgrade(type) {
    const level = this.save.upgrades[type];
    if (level >= UPGRADE_MAX[type]) return;
    const cost = this.upgradeCost(type);
    if (this.save.moons < cost) { this.showToast('Не хватает лун'); this.audio.bad(); return; }
    this.save.moons -= cost; this.save.upgrades[type]++; writeSave(this.save); this.refreshMenu(); this.audio.good();
  }

  refreshMenu() {
    ui.menuMoonValue.textContent = this.save.moons.toLocaleString('ru-RU');
    ui.menuLevelValue.textContent = this.save.level;
    ui.soundBtn.textContent = this.save.sound ? '🔊' : '🔇';
    ui.crowdUpgradeText.textContent = `Старт: ${this.startCount()}`;
    ui.magnetUpgradeText.textContent = `Радиус: ${this.magnetScale().toFixed(1)}×`;
    ui.incomeUpgradeText.textContent = `Доход: +${Math.round((this.incomeScale() - 1) * 100)}%`;
    this.updateUpgradeCard('crowd', ui.upgradeCrowd, ui.crowdUpgradeCost);
    this.updateUpgradeCard('magnet', ui.upgradeMagnet, ui.magnetUpgradeCost);
    this.updateUpgradeCard('income', ui.upgradeIncome, ui.incomeUpgradeCost);
  }

  updateUpgradeCard(type, card, costEl) {
    const maxed = this.save.upgrades[type] >= UPGRADE_MAX[type];
    const cost = maxed ? 0 : this.upgradeCost(type);
    costEl.textContent = maxed ? 'MAX' : cost;
    card.classList.toggle('maxed', maxed);
    card.classList.toggle('can-buy', !maxed && this.save.moons >= cost);
  }

  resize() {
    this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.w = Math.max(320, innerWidth); this.h = Math.max(500, innerHeight);
    canvas.width = Math.round(this.w * this.dpr); canvas.height = Math.round(this.h * this.dpr); canvas.style.width = `${this.w}px`; canvas.style.height = `${this.h}px`;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const wide = this.w / this.h > .78;
    this.horizonY = this.h * (wide ? .20 : .235);
    this.bottomY = this.h * 1.035;
    this.roadBottomHalf = Math.min(this.w * .56, this.h * .43);
    this.roadHorizonHalf = Math.max(38, Math.min(65, this.w * .095));
  }

  startLevel(level) {
    this.level = Math.max(1, Math.floor(level)); this.travel = 0; this.playerX = 0; this.targetX = 0; this.levelMoons = 0;
    this.playerCount = this.startCount(); this.visualCount = this.playerCount; this.cameraShake = 0; this.flash = 0; this.finishMultiplier = 1; this.finishTimer = 0; this.finishStep = 0;
    this.generateLevel(this.level); this.state = 'running'; this.particles.length = 0;
    ui.menu.classList.add('hidden'); ui.result.classList.add('hidden'); ui.hud.classList.remove('hidden');
    ui.levelValue.textContent = String(this.level); ui.moonValue.textContent = String(this.save.moons); ui.progressFill.style.width = '0%'; this.setCount(this.playerCount, false);
  }

  generateLevel(level) {
    const rng = new RNG(0x51510000 + level * 104729);
    const difficulty = clamp((level - 1) / 22, 0, 1);
    const sections = 7 + Math.min(5, Math.floor(level / 3));
    const spacing = lerp(88, 76, difficulty);
    this.baseSpeed = lerp(23, 28, difficulty); this.speed = this.baseSpeed; this.levelLength = 120 + sections * spacing + 120; this.objects = [];
    let d = 95;

    for (let i = 0; i < sections; i++) {
      this.objects.push(this.makeGatePair(rng, d, i, level));
      this.addMoonPattern(rng, d + 22, i);

      if (i > 0 && rng.next() < .82) this.objects.push(this.makeObstacle(rng, d + 44, difficulty, i));

      if (i >= 2 && (i % 3 === 2 || rng.next() < .34)) {
        const base = 10 + level * .7 + i * 2.4;
        const count = Math.max(7, Math.round(base * rng.range(.72, 1.06)));
        this.objects.push({ type: 'enemy', distance: d + 67, x: rng.range(-.18, .18), count, maxCount: count, boss: level % 5 === 0 && i === sections - 2, hit: false, phase: rng.range(0, TAU) });
      }
      d += spacing + rng.range(-5, 6);
    }
    this.objects.push({ type: 'finish', distance: this.levelLength, hit: false });
    this.objects.sort((a, b) => a.distance - b.distance);
  }

  makeGatePair(rng, distance, section, level) {
    const goodA = rng.next() < .5 ? { op:'mul', value:rng.pick([2,2,2,3]) } : { op:'add', value:rng.int(12 + level, 26 + level * 2) };
    let goodB = rng.next() < .58 ? { op:'add', value:rng.int(14, 34 + level) } : { op:'mul', value:rng.pick([2,2,3]) };
    if (section >= 2 && rng.next() < .32) goodB = rng.next() < .65 ? { op:'sub', value:rng.int(5, 14 + Math.floor(level * .45)) } : { op:'div', value:2 };
    const pair = rng.next() < .5 ? [goodA, goodB] : [goodB, goodA];
    return { type:'gate', distance, left:pair[0], right:pair[1], hit:false, phase:rng.range(0,TAU) };
  }

  makeObstacle(rng, distance, difficulty, index) {
    const pool = difficulty < .32 ? ['spinner','pillars','spikes'] : difficulty < .7 ? ['spinner','pillars','spikes','saw','pusher'] : ['spinner','spikes','saw','pusher','pillars'];
    const kind = rng.pick(pool);
    if (kind === 'spinner') return { type:'obstacle', kind, distance, x:0, radius:.42, speed:rng.range(1.0,1.55), phase:rng.range(0,TAU), hit:false };
    if (kind === 'saw') return { type:'obstacle', kind, distance, x:rng.pick([-.48,.48]), motion:rng.range(.22,.34), speed:rng.range(1.15,1.7), phase:rng.range(0,TAU), hit:false };
    if (kind === 'pusher') return { type:'obstacle', kind, distance, side:rng.next()<.5?-1:1, phase:rng.range(0,TAU), speed:rng.range(1.2,1.6), hit:false };
    if (kind === 'spikes') return { type:'obstacle', kind, distance, safeX:rng.pick([-.5,0,.5]), hit:false };
    return { type:'obstacle', kind:'pillars', distance, gaps:index % 2 ? [-.48,.45] : [-.42,0,.45], hit:false };
  }

  addMoonPattern(rng, distance, section) {
    const pattern = rng.pick(['line','zigzag','arc','cluster']);
    const count = rng.int(5, 8);
    for (let i = 0; i < count; i++) {
      let x = 0;
      if (pattern === 'line') x = rng.pick([-.48, 0, .48]);
      if (pattern === 'zigzag') x = i % 2 ? .44 : -.44;
      if (pattern === 'arc') x = Math.sin((i / Math.max(1, count - 1)) * Math.PI - Math.PI / 2) * .53;
      if (pattern === 'cluster') x = rng.range(-.42, .42);
      this.objects.push({ type:'moon', distance:distance + i * 5.2, x, hit:false, bob:rng.range(0,TAU), bonus: section > 3 && rng.next() < .09 });
    }
  }

  loop(now) {
    const dt = Math.min(.035, Math.max(0, (now - this.last) / 1000)); this.last = now; this.time += dt;
    this.update(dt); this.render(); requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.cameraShake = Math.max(0, this.cameraShake - dt * 24); this.flash = Math.max(0, this.flash - dt * 1.8);
    this.updateParticles(dt);
    if (this.state === 'menu') { this.travel = (this.travel + dt * 5.5) % 140; return; }
    if (this.state === 'finish') { this.updateFinish(dt); return; }
    if (this.state !== 'running') return;

    let move = 0; if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) move -= 1; if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) move += 1;
    if (move) this.targetX = clamp(this.targetX + move * dt * 1.45, -.78, .78);
    this.playerX = lerp(this.playerX, this.targetX, 1 - Math.pow(.0008, dt));
    this.travel += this.speed * dt;
    this.visualCount = lerp(this.visualCount, this.playerCount, 1 - Math.pow(.015, dt));
    ui.progressFill.style.width = `${clamp(this.travel / this.levelLength * 100, 0, 100)}%`;

    for (const obj of this.objects) {
      if (obj.hit) continue;
      const rel = obj.distance - this.travel;
      if (obj.type === 'moon') {
        const pickup = 7.5 * this.magnetScale();
        if (rel < pickup && rel > -3.5 && Math.abs(this.playerX - obj.x) < .25 * this.magnetScale()) { obj.hit = true; this.collectMoon(obj); }
        continue;
      }
      if (rel > 7.4 || rel < -4) continue;
      if (obj.type === 'gate') { obj.hit = true; this.applyGate(this.playerX < 0 ? obj.left : obj.right); }
      else if (obj.type === 'obstacle') { obj.hit = true; this.applyObstacle(obj); }
      else if (obj.type === 'enemy') { obj.hit = true; this.resolveEnemy(obj); }
      else if (obj.type === 'finish') { obj.hit = true; this.beginFinish(); break; }
    }
    if (this.playerCount <= 0) this.failLevel();
  }

  applyGate(option) {
    const before = this.playerCount;
    let after = before;
    if (option.op === 'mul') after = before * option.value;
    if (option.op === 'add') after = before + option.value;
    if (option.op === 'sub') after = before - option.value;
    if (option.op === 'div') after = Math.ceil(before / option.value);
    after = clamp(Math.round(after), 1, 220);
    this.playerCount = after; this.setCount(after, true);
    const good = after >= before; if (good) { this.audio.good(); this.burst(this.w*.5, this.h*.67, 20, '#9cf6df'); this.flashScreen('157,246,223', .14); } else { this.audio.bad(); this.burst(this.w*.5, this.h*.67, 14, '#ff8daf'); this.flashScreen('255,100,145', .17); }
  }

  applyObstacle(obj) {
    let danger = false; let lossFactor = .16;
    if (obj.kind === 'spinner') {
      const bladeX = Math.sin(this.time * obj.speed + obj.phase) * .43;
      danger = Math.abs(this.playerX - bladeX) < .30; lossFactor = .18;
    } else if (obj.kind === 'saw') {
      const x = obj.x + Math.sin(this.time * obj.speed + obj.phase) * obj.motion;
      danger = Math.abs(this.playerX - x) < .27; lossFactor = .19;
    } else if (obj.kind === 'pusher') {
      const reach = .18 + (.5 + .5*Math.sin(this.time * obj.speed + obj.phase)) * .42;
      danger = obj.side < 0 ? this.playerX < -(.72 - reach) : this.playerX > (.72 - reach); lossFactor = .15;
    } else if (obj.kind === 'spikes') {
      danger = Math.abs(this.playerX - obj.safeX) > .28; lossFactor = .20;
    } else if (obj.kind === 'pillars') {
      danger = !obj.gaps.some((x) => Math.abs(this.playerX - x) < .22); lossFactor = .14;
    }
    if (!danger) { this.burst(this.w*.5, this.h*.7, 5, '#c8c2ff'); return; }
    const loss = Math.max(2, Math.ceil(this.playerCount * lossFactor));
    this.playerCount = Math.max(0, this.playerCount - loss); this.setCount(this.playerCount, true); this.audio.hit(); this.cameraShake = 8; this.flashScreen('255,90,126', .25); this.burst(this.w*.5, this.h*.72, 22, '#ff7f9f'); this.showToast(`−${loss} из толпы`, 800);
  }

  resolveEnemy(enemy) {
    const before = this.playerCount;
    if (before > enemy.count) {
      this.playerCount = before - enemy.count; enemy.count = 0; this.audio.good(); this.burst(this.w*.5, this.h*.55, 26, enemy.boss ? '#ffd88f' : '#ff9aaa'); this.showToast(enemy.boss ? 'Босс побеждён!' : 'Толпа побеждена', 900);
    } else {
      enemy.count -= before; this.playerCount = 0; this.audio.hit();
    }
    this.setCount(this.playerCount, true); this.cameraShake = enemy.boss ? 12 : 7; this.flashScreen('255,120,150', .22);
  }

  collectMoon(obj) {
    const base = obj.bonus ? 5 : 1; const gain = Math.max(1, Math.round(base * this.incomeScale()));
    this.levelMoons += gain; this.save.moons += gain; writeSave(this.save); ui.moonValue.textContent = String(this.save.moons); this.audio.coin();
    const p = this.project(obj.x, Math.max(4, obj.distance - this.travel)); this.burst(p.x, p.y, obj.bonus ? 14 : 7, '#ffe59a');
  }

  beginFinish() {
    this.state = 'finish'; this.finishTimer = 0; this.finishStep = 0; this.finishMultiplier = 1; this.speed = 0; this.audio.win();
  }

  updateFinish(dt) {
    this.finishTimer += dt;
    const targetSteps = Math.min(8, Math.max(1, Math.floor(this.playerCount / 14) + 1));
    const nextStepAt = .45 + this.finishStep * .19;
    if (this.finishStep < targetSteps && this.finishTimer >= nextStepAt) {
      this.finishStep++; this.finishMultiplier = 1 + this.finishStep * .35; this.audio.coin(); this.burst(this.w*.5, this.h*.58, 12, '#ffe59a');
    }
    if (this.finishTimer > 2.15 && !this.resultTimer) {
      const bonus = Math.round(this.playerCount * this.finishMultiplier * .45 * this.incomeScale());
      this.levelMoons += bonus; this.save.moons += bonus; this.save.level = this.level + 1; writeSave(this.save); ui.moonValue.textContent = String(this.save.moons);
      this.resultTimer = setTimeout(() => { this.resultTimer = null; this.showResult(true); }, 180);
    }
  }

  showResult(won) {
    this.state = won ? 'complete' : 'failed'; ui.hud.classList.add('hidden'); ui.result.classList.remove('hidden');
    ui.resultKicker.textContent = won ? 'СОН ПРОДОЛЖАЕТСЯ' : 'ДОРОГА РАЗБУДИЛА ТЕБЯ'; ui.resultTitle.textContent = won ? 'Уровень пройден!' : 'Толпа закончилась';
    ui.resultCount.textContent = String(Math.max(0, this.playerCount)); ui.resultMoons.textContent = `+${this.levelMoons}`; ui.resultMultiplier.textContent = won ? `×${this.finishMultiplier.toFixed(2)}` : '×1.00';
    ui.nextBtn.classList.toggle('hidden', !won); ui.retryBtn.classList.toggle('hidden', won); this.refreshMenu();
  }

  failLevel() { if (this.state === 'failed' || this.state === 'complete') return; this.state = 'failed'; this.audio.fail(); this.flashScreen('255,75,115', .45); this.showResult(false); }

  setCount(v, pop) {
    ui.countValue.textContent = String(Math.max(0, Math.round(v)));
    if (pop) { ui.countBadge.classList.remove('pop'); void ui.countBadge.offsetWidth; ui.countBadge.classList.add('pop'); setTimeout(() => ui.countBadge.classList.remove('pop'), 180); }
  }

  showToast(text, ms = 1100) { ui.toast.textContent = text; ui.toast.classList.remove('hidden'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), ms); }
  flashScreen(rgb, amount) { this.flashColor = rgb; this.flash = Math.max(this.flash, amount); }
  burst(x, y, count, color) { for (let i=0;i<count;i++) this.particles.push({ x, y, vx:rand(-110,110), vy:rand(-160,30), g:rand(80,170), life:rand(.45,1.05), max:1.05, size:rand(2,5), color }); }
  updateParticles(dt) { for (const p of this.particles) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += p.g*dt; } this.particles = this.particles.filter((p) => p.life > 0); }

  project(x, z, elevation = 0) {
    const zz = clamp(z, 0, this.viewDistance); const t = clamp(1 - zz / this.viewDistance, 0, 1); const curve = Math.pow(t, 1.48);
    const half = lerp(this.roadHorizonHalf, this.roadBottomHalf, curve); const scale = lerp(.16, 1.28, Math.pow(t, 1.18));
    return { x: this.w*.5 + x*half, y: lerp(this.horizonY, this.bottomY, curve) - elevation*scale*34, scale, half, t };
  }

  roadPoint(x, z) { return this.project(x, z); }

  render() {
    ctx.save();
    const sx = this.cameraShake > 0 ? rand(-this.cameraShake, this.cameraShake) : 0; const sy = this.cameraShake > 0 ? rand(-this.cameraShake*.4, this.cameraShake*.4) : 0; ctx.translate(sx, sy);
    this.drawSky(); this.drawRoad(); this.drawWorld();
    ctx.restore();
    this.drawParticles();
    if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashColor},${this.flash})`; ctx.fillRect(0,0,this.w,this.h); }
  }

  drawSky() {
    const g = ctx.createLinearGradient(0,0,0,this.h); g.addColorStop(0,'#080b22'); g.addColorStop(.52,'#171a42'); g.addColorStop(1,'#7a6483'); ctx.fillStyle=g; ctx.fillRect(0,0,this.w,this.h);
    const aurora = ctx.createRadialGradient(this.w*.72,this.h*.24,20,this.w*.72,this.h*.24,this.w*.55); aurora.addColorStop(0,'rgba(145,126,255,.18)'); aurora.addColorStop(.45,'rgba(100,211,210,.06)'); aurora.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=aurora; ctx.fillRect(0,0,this.w,this.h*.72);
    for (const s of this.stars) { const a=.22+.45*(.5+.5*Math.sin(this.time*1.7+s.p)); ctx.globalAlpha=a; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(s.x*this.w,s.y*this.h,s.r,0,TAU); ctx.fill(); } ctx.globalAlpha=1;
    this.drawCrescent(this.w*.76,this.h*.19,Math.min(54,this.w*.075));
    for (const island of this.islandSeed) this.drawIsland(island);
  }

  drawCrescent(x,y,r) { ctx.save(); ctx.shadowBlur=26; ctx.shadowColor='rgba(255,239,170,.35)'; ctx.fillStyle='#fff0ad'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.shadowBlur=0; ctx.fillStyle='#0d112b'; ctx.beginPath(); ctx.arc(x+r*.34,y-r*.18,r*.93,0,TAU); ctx.fill(); ctx.restore(); }

  drawIsland(it) {
    const drift = Math.sin(this.time*.17+it.phase)*5; const x = it.side<0 ? this.w*(.05 + (.07*it.size)) : this.w*(.95 - (.07*it.size)); const y = it.y*this.h + drift; const s=48*it.size;
    ctx.save(); ctx.globalAlpha=.35; ctx.fillStyle='#2b315f'; ctx.beginPath(); ctx.ellipse(x,y,s*.8,s*.22,0,0,TAU); ctx.fill(); ctx.fillStyle='#161c44'; ctx.beginPath(); ctx.moveTo(x-s*.62,y); ctx.lineTo(x+s*.62,y); ctx.lineTo(x+s*.22,y+s*.95); ctx.lineTo(x-s*.15,y+s*1.08); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  drawRoad() {
    const farL=this.roadPoint(-1,this.viewDistance),farR=this.roadPoint(1,this.viewDistance),nearL=this.roadPoint(-1,0),nearR=this.roadPoint(1,0);
    const rg=ctx.createLinearGradient(0,this.horizonY,0,this.h); rg.addColorStop(0,'#d8daf1'); rg.addColorStop(.6,'#eef0fb'); rg.addColorStop(1,'#f8f9ff'); ctx.fillStyle=rg; ctx.beginPath(); ctx.moveTo(farL.x,farL.y);ctx.lineTo(farR.x,farR.y);ctx.lineTo(nearR.x,nearR.y);ctx.lineTo(nearL.x,nearL.y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(136,143,188,.62)'; ctx.lineWidth=5; ctx.beginPath();ctx.moveTo(farL.x,farL.y);ctx.lineTo(nearL.x,nearL.y);ctx.moveTo(farR.x,farR.y);ctx.lineTo(nearR.x,nearR.y);ctx.stroke();
    for (const lane of [-.33,.33]) { const a=this.roadPoint(lane,this.viewDistance),b=this.roadPoint(lane,0); ctx.strokeStyle='rgba(126,132,183,.12)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
    const offset = this.travel % 16; for (let z=this.viewDistance-offset; z>2; z-=16) { const a=this.roadPoint(-.84,z),b=this.roadPoint(.84,z),p=this.roadPoint(0,z); const alpha=.045+.09*p.t; ctx.strokeStyle=`rgba(98,105,150,${alpha})`;ctx.lineWidth=Math.max(1,5*p.scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke(); }
    const edgeGlow=ctx.createLinearGradient(0,this.horizonY,0,this.h);edgeGlow.addColorStop(0,'rgba(192,182,255,.2)');edgeGlow.addColorStop(1,'rgba(148,220,226,.32)');ctx.strokeStyle=edgeGlow;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(farL.x+4,farL.y);ctx.lineTo(nearL.x+4,nearL.y);ctx.moveTo(farR.x-4,farR.y);ctx.lineTo(nearR.x-4,nearR.y);ctx.stroke();
  }

  drawWorld() {
    const visible = this.objects.filter((o) => !o.hit || o.type==='enemy').filter((o) => { const z=o.distance-this.travel; return z>-7 && z<this.viewDistance+4; }).sort((a,b) => (b.distance-this.travel)-(a.distance-this.travel));
    for (const obj of visible) {
      const z=obj.distance-this.travel;
      if (obj.type==='moon'&&!obj.hit) this.drawMoon(obj,z);
      else if (obj.type==='gate'&&!obj.hit) this.drawGate(obj,z);
      else if (obj.type==='obstacle'&&!obj.hit) this.drawObstacle(obj,z);
      else if (obj.type==='enemy'&&!obj.hit) this.drawEnemy(obj,z);
      else if (obj.type==='finish') this.drawFinishLine(z);
    }
    if (this.state==='finish' || this.state==='complete') this.drawFinishStairs();
    this.drawPlayerCrowd();
  }

  drawGate(obj,z) {
    const left=this.project(-.49,z),right=this.project(.49,z); const h=54*left.scale; const w=Math.max(38,left.half*.49);
    this.drawGatePanel(left.x,left.y-h*.18,w,h,obj.left); this.drawGatePanel(right.x,right.y-h*.18,w,h,obj.right);
    ctx.strokeStyle=`rgba(72,78,121,${.4+.45*left.t})`;ctx.lineWidth=Math.max(2,4*left.scale);ctx.beginPath();ctx.moveTo(this.w*.5,left.y-h*.66);ctx.lineTo(this.w*.5,left.y+h*.48);ctx.stroke();
  }

  gateLabel(opt){ return opt.op==='mul'?`×${opt.value}`:opt.op==='add'?`+${opt.value}`:opt.op==='sub'?`−${opt.value}`:`÷${opt.value}`; }
  drawGatePanel(x,y,w,h,opt){ const good=opt.op==='mul'||opt.op==='add'; ctx.save(); const gr=ctx.createLinearGradient(0,y-h/2,0,y+h/2);gr.addColorStop(0,good?'rgba(131,240,218,.88)':'rgba(255,130,164,.88)');gr.addColorStop(1,good?'rgba(75,185,183,.84)':'rgba(183,73,122,.82)');ctx.fillStyle=gr;ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=Math.max(1.5,h*.035);ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,Math.max(4,h*.12));ctx.fill();ctx.stroke();ctx.fillStyle='white';ctx.font=`900 ${Math.max(13,h*.42)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(26,30,64,.45)';ctx.shadowBlur=4;ctx.fillText(this.gateLabel(opt),x,y);ctx.restore(); }

  drawMoon(obj,z) { const p=this.project(obj.x,z,.25+Math.sin(this.time*3+obj.bob)*.08); const r=(obj.bonus?13:8)*p.scale; ctx.save();ctx.shadowBlur=14*p.scale;ctx.shadowColor='rgba(255,225,124,.65)';ctx.fillStyle='#ffe48d';ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#1a1d42';ctx.beginPath();ctx.arc(p.x+r*.35,p.y-r*.18,r*.82,0,TAU);ctx.fill();ctx.restore(); }

  drawObstacle(obj,z) {
    if (obj.kind==='spinner') this.drawSpinner(obj,z);
    else if (obj.kind==='saw') this.drawSaw(obj,z);
    else if (obj.kind==='pusher') this.drawPusher(obj,z);
    else if (obj.kind==='spikes') this.drawSpikes(obj,z);
    else this.drawPillars(obj,z);
  }

  drawSpinner(obj,z){ const p=this.project(0,z,.05),len=p.half*.78,ang=this.time*obj.speed+obj.phase;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);ctx.strokeStyle='#ff6f92';ctx.lineWidth=Math.max(4,10*p.scale);ctx.lineCap='round';ctx.shadowBlur=12*p.scale;ctx.shadowColor='rgba(255,82,127,.35)';ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(len,0);ctx.stroke();ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(-len*.72,0);ctx.lineTo(len*.72,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#f4efff';ctx.beginPath();ctx.arc(0,0,Math.max(5,11*p.scale),0,TAU);ctx.fill();ctx.restore(); }
  drawSaw(obj,z){ const x=obj.x+Math.sin(this.time*obj.speed+obj.phase)*obj.motion,p=this.project(x,z,.04),r=Math.max(10,20*p.scale);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(this.time*2.3);ctx.fillStyle='#ff5f7f';ctx.strokeStyle='#6c3154';ctx.lineWidth=Math.max(1,2*p.scale);ctx.beginPath();for(let i=0;i<20;i++){const a=i/20*TAU,rr=i%2?r:r*.68;const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#5b5878';ctx.beginPath();ctx.arc(0,0,r*.3,0,TAU);ctx.fill();ctx.restore(); }
  drawPusher(obj,z){ const p=this.project(obj.side*.68,z,.04),reach=.18+(.5+.5*Math.sin(this.time*obj.speed+obj.phase))*.42,innerX=obj.side<0?-.72+reach:.72-reach,q=this.project(innerX,z,.04);const w=Math.abs(q.x-p.x)+20*p.scale,h=Math.max(14,34*p.scale);ctx.save();ctx.fillStyle='#5d5a8f';ctx.fillRect(Math.min(p.x,q.x),p.y-h*.16,w,h*.32);ctx.fillStyle='#ff718f';ctx.beginPath();ctx.roundRect(q.x-h*.42,p.y-h*.5,h*.84,h,Math.max(4,h*.16));ctx.fill();ctx.restore(); }
  drawSpikes(obj,z){ for(let i=-2;i<=2;i++){const x=i*.25;if(Math.abs(x-obj.safeX)<.23)continue;const p=this.project(x,z+Math.abs(i)*.8,.02),s=16*p.scale;ctx.fillStyle='#ff765f';ctx.strokeStyle='rgba(95,55,75,.35)';ctx.lineWidth=Math.max(1,1.5*p.scale);ctx.beginPath();ctx.moveTo(p.x-s,p.y+s*.55);ctx.lineTo(p.x,p.y-s*1.3);ctx.lineTo(p.x+s,p.y+s*.55);ctx.closePath();ctx.fill();ctx.stroke();} }
  drawPillars(obj,z){ for(let i=-2;i<=2;i++){const x=i*.36;if(obj.gaps.some(g=>Math.abs(x-g)<.22))continue;const p=this.project(x,z,.02),w=26*p.scale,h=58*p.scale;ctx.fillStyle='#5b5b88';ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=Math.max(1,2*p.scale);ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-h,w,h,Math.max(3,6*p.scale));ctx.fill();ctx.stroke();ctx.fillStyle='#ff6d8b';ctx.fillRect(p.x-w*.34,p.y-h*.85,w*.68,h*.18);} }

  drawEnemy(obj,z){ const p=this.project(obj.x,z,.02),n=Math.min(obj.count,obj.boss?70:55),scale=p.scale*(obj.boss?1.08:1);const cols=Math.max(3,Math.ceil(Math.sqrt(n)*1.1));const spacing=11*scale;for(let i=n-1;i>=0;i--){const row=Math.floor(i/cols),col=i%cols;const ox=(col-(Math.min(cols,n-row*cols)-1)/2)*spacing;const oy=row*spacing*.72;this.drawPerson(p.x+ox,p.y-oy,scale*.8,obj.boss?'#ff8a58':'#ff7c99','#512843');}this.drawCountBubble(p.x,p.y-Math.sqrt(n)*spacing*.8-20*scale,obj.count,obj.boss?'#ef7149':'#ce4f78',scale); }

  drawPlayerCrowd(){ const n=Math.min(Math.max(1,Math.round(this.visualCount)),120); const cols=Math.max(3,Math.ceil(Math.sqrt(n)*1.22)); const spacingX=Math.min(22,16+this.w*.008); const spacingZ=4.6; const formation=[];
    for(let i=0;i<n;i++){const row=Math.floor(i/cols),rowCount=Math.min(cols,n-row*cols),col=i%cols;formation.push({x:(col-(rowCount-1)/2)*(spacingX/Math.max(150,this.roadBottomHalf))*1.6,z:5.5+row*spacingZ});}
    formation.sort((a,b)=>b.z-a.z);
    for(let i=0;i<formation.length;i++){const f=formation[i],p=this.project(this.playerX+f.x,f.z,.02);const bob=Math.sin(this.time*7+i*.71)*1.5*p.scale;this.drawPerson(p.x,p.y+bob,p.scale*1.08,'#83e4cf','#205c69');}
    const anchor=this.project(this.playerX,5.4,.02);this.drawCountBubble(anchor.x,anchor.y-Math.min(90,Math.sqrt(n)*18)-24,this.playerCount,'#375d8a',1.05);
  }

  drawPerson(x,y,scale,body,shade){ const s=clamp(scale, .26,1.25); const head=5.5*s,torsoW=7*s,torsoH=12*s,leg=8*s;ctx.save();ctx.lineCap='round';ctx.strokeStyle=shade;ctx.lineWidth=Math.max(1,2.2*s);ctx.beginPath();ctx.moveTo(x-torsoW*.25,y-torsoH*.12);ctx.lineTo(x-torsoW*.68,y+torsoH*.28);ctx.moveTo(x+torsoW*.25,y-torsoH*.12);ctx.lineTo(x+torsoW*.68,y+torsoH*.28);ctx.moveTo(x-torsoW*.2,y+torsoH*.55);ctx.lineTo(x-torsoW*.32,y+torsoH*.55+leg);ctx.moveTo(x+torsoW*.2,y+torsoH*.55);ctx.lineTo(x+torsoW*.32,y+torsoH*.55+leg);ctx.stroke();ctx.fillStyle=body;ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=Math.max(.7,1.1*s);ctx.beginPath();ctx.roundRect(x-torsoW/2,y-torsoH*.45,torsoW,torsoH,3*s);ctx.fill();ctx.stroke();ctx.shadowBlur=6*s;ctx.shadowColor='rgba(129,227,208,.22)';ctx.beginPath();ctx.arc(x,y-torsoH*.7-head*.6,head,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.restore(); }

  drawCountBubble(x,y,value,color,scale){ const text=String(Math.max(0,Math.round(value)));ctx.save();ctx.font=`900 ${Math.max(13,20*scale)}px system-ui`;const w=Math.max(42*scale,ctx.measureText(text).width+22*scale),h=34*scale;ctx.fillStyle=color;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=Math.max(1,1.6*scale);ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,10*scale);ctx.fill();ctx.stroke();ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowBlur=3;ctx.shadowColor='rgba(0,0,0,.35)';ctx.fillText(text,x,y+1);ctx.restore(); }

  drawFinishLine(z){ const p=this.project(0,z,.02),l=this.project(-.82,z,.02),r=this.project(.82,z,.02);ctx.strokeStyle='rgba(39,44,77,.7)';ctx.lineWidth=Math.max(2,5*p.scale);ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.stroke();const flag=10*p.scale;for(let i=0;i<10;i++){const x=lerp(l.x,r.x,i/9);ctx.fillStyle=i%2?'#f7f7ff':'#444a75';ctx.fillRect(x-flag*.5,p.y-flag*.5,flag,flag);} }

  drawFinishStairs(){ const baseY=this.h*.47,baseW=Math.min(this.w*.8,460),stepH=Math.max(28,this.h*.043);ctx.save();for(let i=0;i<8;i++){const y=baseY+i*stepH,w=baseW-i*baseW*.055,h=stepH+2;const active=i<this.finishStep;const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,active?'#8ce9d0':`hsl(${205+i*11} 72% ${60-i*2}%)`);g.addColorStop(1,active?'#62b8bf':`hsl(${220+i*10} 58% ${46-i*1.5}%)`);ctx.fillStyle=g;ctx.fillRect((this.w-w)/2,y,w,h);ctx.fillStyle='rgba(255,255,255,.94)';ctx.font=`900 ${Math.max(13,18-this.w/2000)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`×${(1+(i+1)*.35).toFixed(2)}`,this.w/2,y+h/2);}ctx.restore(); }

  drawParticles(){ ctx.save();for(const p of this.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();}ctx.restore(); }
}

new SleepRoad();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
