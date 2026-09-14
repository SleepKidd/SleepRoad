const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

const ui = {
  hud: $('hud'),
  menu: $('menu'),
  result: $('result'),
  playBtn: $('playBtn'),
  nextBtn: $('nextBtn'),
  retryBtn: $('retryBtn'),
  soundBtn: $('soundBtn'),
  levelValue: $('levelValue'),
  coinValue: $('coinValue'),
  countValue: $('countValue'),
  countBadge: $('countBadge'),
  progressFill: $('progressFill'),
  comboBadge: $('comboBadge'),
  comboValue: $('comboValue'),
  bestLevel: $('bestLevel'),
  bestCoins: $('bestCoins'),
  resultKicker: $('resultKicker'),
  resultTitle: $('resultTitle'),
  resultCount: $('resultCount'),
  resultCoins: $('resultCoins'),
  resultCombo: $('resultCombo'),
  toast: $('toast')
};

const STORAGE_KEY = 'sleep-road-save-v1';
const DEFAULT_SAVE = { level: 1, bestLevel: 1, coins: 0, sound: true };

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return {
      level: Math.max(1, Number(parsed.level) || 1),
      bestLevel: Math.max(1, Number(parsed.bestLevel) || 1),
      coins: Math.max(0, Number(parsed.coins) || 0),
      sound: parsed.sound !== false
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function writeSave(save) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch { /* private mode */ }
}

class AudioEngine {
  constructor(enabled) {
    this.enabled = enabled;
    this.ac = null;
    this.master = null;
  }

  ensure() {
    if (!this.enabled) return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ac) {
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.13;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    return true;
  }

  setEnabled(value) {
    this.enabled = value;
    if (value) this.ensure();
  }

  tone(freq = 440, duration = 0.08, type = 'sine', gain = 0.12, slide = 1) {
    if (!this.ensure()) return;
    const now = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const amp = this.ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  gate(good) {
    if (good) {
      this.tone(520, .08, 'triangle', .09, 1.5);
      setTimeout(() => this.tone(760, .11, 'sine', .07, 1.25), 55);
    } else {
      this.tone(180, .14, 'sawtooth', .07, .72);
    }
  }

  coin() { this.tone(900, .08, 'sine', .06, 1.35); }
  hit() { this.tone(120, .11, 'square', .06, .55); }
  shield() { this.tone(360, .2, 'triangle', .06, 2.1); }
  battle() { this.tone(170, .07, 'sawtooth', .045, .85); }
  win() {
    this.tone(440, .15, 'triangle', .07, 1.35);
    setTimeout(() => this.tone(620, .18, 'triangle', .07, 1.35), 110);
    setTimeout(() => this.tone(840, .28, 'sine', .07, 1.18), 230);
  }
  lose() { this.tone(220, .35, 'triangle', .08, .45); }
}

class RNG {
  constructor(seed) { this.seed = (seed >>> 0) || 1; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
}


class SleepRoadGame {
  constructor() {
    this.save = loadSave();
    this.audio = new AudioEngine(this.save.sound);
    this.state = 'menu';
    this.level = this.save.level;
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.viewDistance = 135;
    this.horizonY = 180;
    this.bottomY = 800;
    this.roadBottomHalf = 360;
    this.roadHorizonHalf = 44;
    this.time = 0;
    this.last = performance.now();
    this.travel = 0;
    this.levelLength = 900;
    this.baseSpeed = 25;
    this.speed = 25;
    this.playerX = 0;
    this.targetX = 0;
    this.playerCount = 14;
    this.visualCount = 14;
    this.objects = [];
    this.particles = [];
    this.stars = [];
    this.clouds = [];
    this.pointer = { down: false, startX: 0, startPlayerX: 0 };
    this.keys = new Set();
    this.combo = 1;
    this.comboTimer = 0;
    this.bestCombo = 1;
    this.levelCoins = 0;
    this.shield = 0;
    this.flash = 0;
    this.flashTint = '255,255,255';
    this.cameraShake = 0;
    this.battle = null;
    this.finishTriggered = false;
    this.toastTimer = 0;
    this.tipShown = false;
    this.lastCountShown = this.playerCount;
    this.backgroundPhase = Math.random() * 100;

    this.createBackdrop();
    this.bindEvents();
    this.resize();
    this.refreshMenu();
    requestAnimationFrame((t) => this.loop(t));
  }

}

SleepRoadGame.prototype.createBackdrop = function() {
    const rng = new RNG(0x5ee9c0de);
    this.stars = Array.from({ length: 95 }, () => ({
      x: rng.next(), y: rng.range(.025, .56), r: rng.range(.5, 2), a: rng.range(.22, .9), p: rng.range(0, TAU)
    }));
    this.clouds = Array.from({ length: 10 }, (_, i) => ({
      x: rng.range(-.15, 1.15), y: rng.range(.12, .58), size: rng.range(.55, 1.45), speed: rng.range(.003, .012), phase: i * .7
    }));
  };


SleepRoadGame.prototype.bindEvents = function() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150), { passive: true });

    const startPointer = (e) => {
      if (this.state !== 'running' && this.state !== 'battle') return;
      this.pointer.down = true;
      this.pointer.startX = e.clientX;
      this.pointer.startPlayerX = this.targetX;
      if (canvas.setPointerCapture && e.pointerId != null) {
        try { canvas.setPointerCapture(e.pointerId); } catch {}
      }
    };
    const movePointer = (e) => {
      if (!this.pointer.down || (this.state !== 'running' && this.state !== 'battle')) return;
      const dx = e.clientX - this.pointer.startX;
      const sensitivity = this.w < 600 ? 1.75 : 1.35;
      this.targetX = clamp(this.pointer.startPlayerX + (dx / Math.max(240, this.w)) * sensitivity, -.82, .82);
    };
    const endPointer = () => { this.pointer.down = false; };

    canvas.addEventListener('pointerdown', startPointer);
    canvas.addEventListener('pointermove', movePointer);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    ui.playBtn.addEventListener('click', () => {
      this.audio.ensure();
      this.startLevel(this.save.level);
    });
    ui.nextBtn.addEventListener('click', () => {
      this.audio.ensure();
      this.startLevel(this.level + 1);
    });
    ui.retryBtn.addEventListener('click', () => {
      this.audio.ensure();
      this.startLevel(this.level);
    });
    ui.soundBtn.addEventListener('click', () => {
      this.save.sound = !this.save.sound;
      this.audio.setEnabled(this.save.sound);
      writeSave(this.save);
      this.updateSoundButton();
      if (this.save.sound) this.audio.coin();
    });

    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
    });
  };


SleepRoadGame.prototype.resize = function() {
    this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    this.w = Math.max(320, window.innerWidth);
    this.h = Math.max(480, window.innerHeight);
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    canvas.style.width = `${this.w}px`;
    canvas.style.height = `${this.h}px`;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.horizonY = this.h * (this.w / this.h > .9 ? .22 : .255);
    this.bottomY = this.h * 1.06;
    this.roadBottomHalf = Math.min(this.w * .61, this.h * .49);
    this.roadHorizonHalf = Math.max(34, Math.min(this.w * .08, 64));
  };


SleepRoadGame.prototype.refreshMenu = function() {
    ui.bestLevel.textContent = `${this.save.bestLevel} ур.`;
    ui.bestCoins.textContent = Math.floor(this.save.coins).toLocaleString('ru-RU');
    this.updateSoundButton();
  };


SleepRoadGame.prototype.updateSoundButton = function() {
    ui.soundBtn.textContent = this.save.sound ? '🔊' : '🔇';
    ui.soundBtn.setAttribute('aria-label', this.save.sound ? 'Выключить звук' : 'Включить звук');
  };


SleepRoadGame.prototype.startLevel = function(level) {
    this.level = Math.max(1, level);
    this.save.level = this.level;
    this.save.bestLevel = Math.max(this.save.bestLevel, this.level);
    writeSave(this.save);

    this.state = 'running';
    this.travel = 0;
    this.playerX = 0;
    this.targetX = 0;
    this.playerCount = 14 + Math.min(10, Math.floor((this.level - 1) / 3));
    this.visualCount = this.playerCount;
    this.combo = 1;
    this.bestCombo = 1;
    this.comboTimer = 0;
    this.levelCoins = 0;
    this.shield = 0;
    this.flash = 0;
    this.cameraShake = 0;
    this.battle = null;
    this.finishTriggered = false;
    this.particles.length = 0;
    this.generateLevel(this.level);

    ui.menu.classList.add('hidden');
    ui.result.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.retryBtn.classList.add('hidden');
    ui.nextBtn.classList.remove('hidden');
    ui.levelValue.textContent = String(this.level);
    ui.coinValue.textContent = String(this.save.coins);
    this.setCountUI(this.playerCount, false);
    this.updateComboUI();
    ui.progressFill.style.width = '0%';

    if (!this.tipShown) {
      this.showToast(this.w < 700 ? 'Веди пальцем влево и вправо' : 'Управление: мышь / A D / ← →', 2600);
      this.tipShown = true;
    }
  };


