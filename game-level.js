'use strict';

SleepRoadGame.prototype.generateLevel = function(level) {
    const rng = new RNG(0x51ee0000 + level * 977);
    const difficulty = Math.min(1, (level - 1) / 24);
    const sections = 8 + Math.min(5, Math.floor(level / 3));
    const spacing = lerp(76, 68, difficulty);
    this.levelLength = 105 + sections * spacing + 115;
    this.baseSpeed = lerp(23.5, 29.5, difficulty);
    this.speed = this.baseSpeed;
    this.objects = [];

    let d = 100;
    for (let i = 0; i < sections; i++) {
      const gate = this.makeGatePair(rng, d, i, level);
      this.objects.push(gate);

      if (i > 0) {
        const moonCount = rng.int(3, 6);
        const pattern = rng.pick(['line', 'zigzag', 'arc']);
        for (let m = 0; m < moonCount; m++) {
          let x = 0;
          if (pattern === 'line') x = rng.pick([-.48, 0, .48]);
          if (pattern === 'zigzag') x = (m % 2 ? .42 : -.42);
          if (pattern === 'arc') x = Math.sin((m / Math.max(1, moonCount - 1)) * Math.PI - Math.PI / 2) * .5;
          this.objects.push({ type: 'moon', distance: d + 19 + m * 5.2, x, hit: false, bob: rng.range(0, TAU) });
        }
      }

      const obstacleDistance = d + 36;
      if (i >= 1 && rng.next() < .74) {
        this.objects.push(this.makeObstacle(rng, obstacleDistance, difficulty));
      }

      if (i >= 2 && (i % 2 === 0 || rng.next() < .38)) {
        const enemyBase = 11 + level * .7 + i * 1.8;
        const enemyCount = Math.max(8, Math.round(enemyBase * rng.range(.78, 1.12)));
        this.objects.push({ type: 'enemy', distance: d + 57, x: rng.range(-.12, .12), count: enemyCount, maxCount: enemyCount, hit: false, pulse: rng.range(0, TAU) });
      } else if (i >= 2 && rng.next() < .25) {
        this.objects.push({ type: 'shield', distance: d + 55, x: rng.pick([-.48, .48]), hit: false, bob: rng.range(0, TAU) });
      }

      d += spacing + rng.range(-4, 5);
    }

    this.objects.push({ type: 'finish', distance: this.levelLength, x: 0, hit: false });
    this.objects.sort((a, b) => a.distance - b.distance);
  };


SleepRoadGame.prototype.makeGatePair = function(rng, distance, section, level) {
    const early = section < 2;
    const options = [];

    if (early || rng.next() < .62) {
      options.push({ op: 'mul', value: rng.pick([2, 2, 2, 3]) });
      options.push({ op: 'add', value: rng.int(10 + level, 24 + level * 2) });
    } else {
      const mode = rng.next();
      if (mode < .4) {
        options.push({ op: 'mul', value: rng.pick([2, 3]) });
        options.push({ op: 'sub', value: rng.int(5, 16 + Math.floor(level * .5)) });
      } else if (mode < .74) {
        options.push({ op: 'add', value: rng.int(20, 45 + level) });
        options.push({ op: 'add', value: rng.int(7, 18) });
      } else {
        options.push({ op: 'mul', value: 2 });
        options.push({ op: 'sub', value: rng.int(8, 22) });
      }
    }

    if (rng.next() < .5) options.reverse();
    return { type: 'gate', distance, left: options[0], right: options[1], hit: false, phase: rng.range(0, TAU) };
  };


SleepRoadGame.prototype.makeObstacle = function(rng, distance, difficulty) {
    const type = rng.pick(difficulty > .45 ? ['spinner', 'gap', 'pulse', 'spinner'] : ['spinner', 'gap', 'pulse']);
    if (type === 'gap') {
      return { type: 'obstacle', obstacle: 'gap', distance, gapX: rng.range(-.42, .42), gapWidth: rng.range(.34, .46), hit: false, phase: rng.range(0, TAU) };
    }
    if (type === 'pulse') {
      return { type: 'obstacle', obstacle: 'pulse', distance, x: rng.pick([-.46, 0, .46]), width: .24, hit: false, phase: rng.range(0, TAU) };
    }
    return { type: 'obstacle', obstacle: 'spinner', distance, x: 0, width: .20, hit: false, phase: rng.range(0, TAU), motion: rng.range(.38, .58), speed: rng.range(1.2, 1.8) };
  };


SleepRoadGame.prototype.applyGate = function(option) {
    const before = this.playerCount;
    let after = before;
    if (option.op === 'mul') after = before * option.value;
    else if (option.op === 'add') after = before + option.value;
    else if (option.op === 'sub') after = before - option.value;
    after = clamp(Math.round(after), 1, 999);
    this.playerCount = after;
    const good = after >= before;
    this.audio.gate(good);
    this.flashScreen(good ? '156,255,224' : '255,111,145', good ? .20 : .28);
    this.spawnBurst(this.w * .5, this.h * .42, good ? 18 : 10, good ? '#a8ffde' : '#ff8ca8');
    this.bumpCombo(good ? 1 : -1);
    this.setCountUI(after, true);
  };


SleepRoadGame.prototype.applyObstacle = function(obj) {
    let collided = false;
    let dangerX = obj.x || 0;
    if (obj.obstacle === 'spinner') {
      dangerX = Math.sin(this.time * obj.speed + obj.phase) * obj.motion;
      collided = Math.abs(this.playerX - dangerX) < .25;
    } else if (obj.obstacle === 'pulse') {
      const activeWidth = obj.width + (Math.sin(this.time * 4 + obj.phase) * .5 + .5) * .08;
      collided = Math.abs(this.playerX - obj.x) < activeWidth + .12;
    } else if (obj.obstacle === 'gap') {
      collided = Math.abs(this.playerX - obj.gapX) > obj.gapWidth;
    }

    if (!collided) {
      this.bumpCombo(1);
      return;
    }

    if (this.shield > 0) {
      this.shield--;
      this.audio.shield();
      this.flashScreen('173,216,255', .24);
      this.showToast('Щит поглотил удар', 900);
      this.spawnBurst(this.w * .5, this.h * .62, 20, '#b8e2ff');
      return;
    }

    const loss = Math.max(2, Math.ceil(this.playerCount * rand(.11, .20)));
    this.playerCount = Math.max(0, this.playerCount - loss);
    this.audio.hit();
    this.cameraShake = Math.max(this.cameraShake, 8);
    this.flashScreen('255,90,122', .34);
    this.bumpCombo(-2);
    this.setCountUI(this.playerCount, true);
    this.showToast(`−${loss} из толпы`, 900);
    this.spawnBurst(this.w * .5, this.h * .67, 22, '#ff779a');
    if (this.playerCount <= 0) this.failLevel();
  };


SleepRoadGame.prototype.collectMoon = function(obj) {
    const p = this.project(obj.x, Math.max(5, obj.distance - this.travel), .3);
    this.levelCoins += this.combo;
    this.save.coins += this.combo;
    writeSave(this.save);
    ui.coinValue.textContent = String(this.save.coins);
    this.audio.coin();
    this.bumpCombo(1);
    this.spawnBurst(p.x, p.y, 8, '#ffe9a7');
  };


SleepRoadGame.prototype.collectShield = function(obj) {
    this.shield = Math.min(2, this.shield + 1);
    const p = this.project(obj.x, Math.max(5, obj.distance - this.travel), .3);
    this.audio.shield();
    this.flashScreen('173,216,255', .16);
    this.spawnBurst(p.x, p.y, 16, '#b8e2ff');
    this.showToast(`Лунный щит ×${this.shield}`, 1100);
    this.bumpCombo(1);
  };


SleepRoadGame.prototype.startBattle = function(enemy) {
    if (this.state !== 'running') return;
    enemy.hit = true;
    this.state = 'battle';
    this.battle = enemy;
    enemy.distance = this.travel + 8.5;
    this.battleAccumulator = 0;
    this.showToast(`${this.playerCount} против ${enemy.count}`, 900);
  };


SleepRoadGame.prototype.updateBattle = function(dt) {
    const enemy = this.battle;
    if (!enemy) {
      this.state = 'running';
      return;
    }

    this.battleAccumulator += dt;
    const interval = clamp(.055 - Math.min(this.playerCount, enemy.count) * .00035, .018, .055);
    while (this.battleAccumulator >= interval && this.playerCount > 0 && enemy.count > 0) {
      this.battleAccumulator -= interval;
      this.playerCount--;
      enemy.count--;
      if ((enemy.count + this.playerCount) % 5 === 0) this.audio.battle();
      if (Math.random() < .65) {
        const x = this.w * .5 + rand(-40, 40);
        const y = this.h * .50 + rand(-12, 26);
        this.spawnBurst(x, y, 2, Math.random() < .5 ? '#a8ffde' : '#ff7d9e');
      }
      this.cameraShake = Math.max(this.cameraShake, 2.6);
    }
    this.setCountUI(this.playerCount, false);

    if (this.playerCount <= 0) {
      this.failLevel();
      return;
    }
    if (enemy.count <= 0) {
      this.state = 'running';
      this.battle = null;
      this.audio.gate(true);
      this.bumpCombo(2);
      this.flashScreen('156,255,224', .17);
      this.showToast('Толпа побеждена', 800);
    }
  };


SleepRoadGame.prototype.bumpCombo = function(delta) {
    if (delta < 0) {
      this.combo = 1;
      this.comboTimer = 0;
    } else {
      this.comboTimer = 4.8;
      this.combo = clamp(this.combo + (delta >= 2 ? 1 : (Math.random() < .45 ? 1 : 0)), 1, 8);
    }
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.updateComboUI();
  };


SleepRoadGame.prototype.updateComboUI = function() {
    if (this.combo > 1 && this.comboTimer > 0) {
      ui.comboBadge.classList.remove('hidden');
      ui.comboValue.textContent = `x${this.combo}`;
    } else {
      ui.comboBadge.classList.add('hidden');
    }
  };


SleepRoadGame.prototype.setCountUI = function(value, pop) {
    const rounded = Math.max(0, Math.round(value));
    if (rounded !== this.lastCountShown || pop) {
      ui.countValue.textContent = String(rounded);
      this.lastCountShown = rounded;
    }
    if (pop) {
      ui.countBadge.classList.remove('pop');
      void ui.countBadge.offsetWidth;
      ui.countBadge.classList.add('pop');
      setTimeout(() => ui.countBadge.classList.remove('pop'), 170);
    }
  };


SleepRoadGame.prototype.showToast = function(text, ms = 1200) {
    ui.toast.textContent = text;
    ui.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), ms);
  };


SleepRoadGame.prototype.flashScreen = function(rgb, amount) {
    this.flashTint = rgb;
    this.flash = Math.max(this.flash, amount);
  };


SleepRoadGame.prototype.finishLevel = function() {
    if (this.finishTriggered || this.state === 'complete') return;
    this.finishTriggered = true;
    this.state = 'complete';
    this.audio.win();
    this.save.level = this.level + 1;
    this.save.bestLevel = Math.max(this.save.bestLevel, this.level + 1);
    writeSave(this.save);
    this.refreshMenu();

    ui.hud.classList.add('hidden');
    ui.result.classList.remove('hidden');
    ui.resultKicker.textContent = 'СОН ПРОДОЛЖАЕТСЯ';
    ui.resultTitle.textContent = 'Уровень пройден';
    ui.resultCount.textContent = String(this.playerCount);
    ui.resultCoins.textContent = `+${this.levelCoins}`;
    ui.resultCombo.textContent = `x${this.bestCombo}`;
    ui.nextBtn.classList.remove('hidden');
    ui.retryBtn.classList.add('hidden');

    for (let i = 0; i < 90; i++) {
      const palette = ['#a8ffde', '#c3b5ff', '#ffd1ef', '#ffe7a6'];
      this.particles.push({
        x: this.w * .5 + rand(-110, 110), y: this.h * .42 + rand(-30, 50),
        vx: rand(-110, 110), vy: rand(-220, -40), g: rand(80, 180),
        life: rand(1.1, 2.3), maxLife: 2.3, size: rand(2, 6), color: palette[randInt(0, palette.length - 1)], rot: rand(0, TAU), vr: rand(-5, 5)
      });
    }
  };


SleepRoadGame.prototype.failLevel = function() {
    if (this.state === 'failed') return;
    this.state = 'failed';
    this.audio.lose();
    this.save.level = this.level;
    writeSave(this.save);

    ui.hud.classList.add('hidden');
    ui.result.classList.remove('hidden');
    ui.resultKicker.textContent = 'ДОРОГА РАЗБУДИЛА ТЕБЯ';
    ui.resultTitle.textContent = 'Толпа закончилась';
    ui.resultCount.textContent = '0';
    ui.resultCoins.textContent = `+${this.levelCoins}`;
    ui.resultCombo.textContent = `x${this.bestCombo}`;
    ui.nextBtn.classList.add('hidden');
    ui.retryBtn.classList.remove('hidden');
    this.flashScreen('255,90,122', .5);
  };


SleepRoadGame.prototype.project = function(x, z, elevation = 0) {
    const zz = clamp(z, 0, this.viewDistance);
    const t = clamp(1 - zz / this.viewDistance, 0, 1);
    const curve = Math.pow(t, 1.52);
    const half = lerp(this.roadHorizonHalf, this.roadBottomHalf, curve);
    const scale = lerp(.14, 1.34, Math.pow(t, 1.23));
    return {
      x: this.w * .5 + x * half,
      y: this.horizonY + curve * (this.bottomY - this.horizonY) - elevation * 34 * scale,
      half,
      scale,
      t
    };
  };


