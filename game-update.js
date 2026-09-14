'use strict';

SleepRoadGame.prototype.update = function(dt) {
    this.time += dt;
    this.visualCount = lerp(this.visualCount, this.playerCount, 1 - Math.exp(-dt * 10));
    this.flash = Math.max(0, this.flash - dt * 1.7);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 14);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateComboUI();
      }
    }

    this.updateParticles(dt);
    if (this.state === 'battle') this.updateBattle(dt);
    if (this.state !== 'running') return;

    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    if (left !== right) this.targetX = clamp(this.targetX + (right ? 1 : -1) * dt * 1.28, -.82, .82);
    this.playerX = lerp(this.playerX, this.targetX, 1 - Math.exp(-dt * 11.5));

    this.speed = this.baseSpeed * (1 + Math.min(.12, this.combo * .008));
    this.travel += this.speed * dt;
    ui.progressFill.style.width = `${clamp(this.travel / this.levelLength * 100, 0, 100).toFixed(2)}%`;

    for (const obj of this.objects) {
      if (obj.hit) continue;
      const z = obj.distance - this.travel;
      if (obj.type === 'moon') {
        if (z < 7.4 && z > -2.5) {
          if (Math.abs(this.playerX - obj.x) < .24) {
            obj.hit = true;
            this.collectMoon(obj);
          } else if (z < -1.6) obj.hit = true;
        }
        continue;
      }
      if (obj.type === 'shield') {
        if (z < 7.5 && z > -2) {
          if (Math.abs(this.playerX - obj.x) < .27) {
            obj.hit = true;
            this.collectShield(obj);
          } else if (z < -1.2) obj.hit = true;
        }
        continue;
      }
      if (z > 7.2) continue;

      if (obj.type === 'gate') {
        obj.hit = true;
        this.applyGate(this.playerX < 0 ? obj.left : obj.right);
      } else if (obj.type === 'obstacle') {
        obj.hit = true;
        this.applyObstacle(obj);
      } else if (obj.type === 'enemy') {
        this.startBattle(obj);
        break;
      } else if (obj.type === 'finish') {
        obj.hit = true;
        this.finishLevel();
        break;
      }
    }
  };


SleepRoadGame.prototype.updateParticles = function(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.g ?? 30) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot = (p.rot || 0) + (p.vr || 0) * dt;
    }
  };


SleepRoadGame.prototype.spawnBurst = function(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(25, 120);
      const life = rand(.35, .9);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 28, g: 85, life, maxLife: life, size: rand(1.5, 4.2), color, rot: 0, vr: 0 });
    }
  };


