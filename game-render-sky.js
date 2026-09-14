'use strict';

SleepRoadGame.prototype.drawSky = function() {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#07091d');
    g.addColorStop(.30, '#141535');
    g.addColorStop(.58, '#302850');
    g.addColorStop(.78, '#725276');
    g.addColorStop(1, '#0b0d25');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    const glow = ctx.createRadialGradient(this.w * .72, this.h * .20, 0, this.w * .72, this.h * .20, this.w * .5);
    glow.addColorStop(0, 'rgba(208,190,255,.21)');
    glow.addColorStop(.42, 'rgba(138,111,201,.09)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.w, this.h * .72);

    for (const s of this.stars) {
      const twinkle = s.a * (.7 + .3 * Math.sin(this.time * 1.4 + s.p));
      ctx.beginPath();
      ctx.fillStyle = `rgba(244,240,255,${twinkle})`;
      ctx.arc(s.x * this.w, s.y * this.h, s.r, 0, TAU);
      ctx.fill();
    }

    const mx = this.w * .74;
    const my = this.h * .17;
    const mr = clamp(this.w * .055, 28, 48);
    const mg = ctx.createRadialGradient(mx - mr * .28, my - mr * .34, mr * .06, mx, my, mr * 1.8);
    mg.addColorStop(0, 'rgba(255,252,220,.95)');
    mg.addColorStop(.38, 'rgba(246,235,198,.88)');
    mg.addColorStop(.52, 'rgba(212,196,255,.22)');
    mg.addColorStop(1, 'rgba(212,196,255,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4cc';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#17172f';
    ctx.beginPath(); ctx.arc(mx + mr * .38, my - mr * .18, mr * .86, 0, TAU); ctx.fill();

    for (const c of this.clouds) {
      let x = ((c.x + this.time * c.speed) % 1.3) - .15;
      const y = c.y + Math.sin(this.time * .1 + c.phase) * .008;
      this.drawCloud(x * this.w, y * this.h, 70 * c.size, .055 + c.size * .012);
    }

    this.drawSideIslands();
  };


SleepRoadGame.prototype.drawCloud = function(x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    cg.addColorStop(0, '#f3e8ff');
    cg.addColorStop(1, 'rgba(181,158,217,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.4, size * .42, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };


SleepRoadGame.prototype.drawSideIslands = function() {
    for (let i = 0; i < 7; i++) {
      const z = ((i * 31 + 22 - (this.travel * .23) % 217) + 217) % 217;
      const p = this.project(i % 2 ? 1.85 : -1.85, clamp(z, 8, this.viewDistance), 0);
      if (p.y < this.horizonY - 20 || p.y > this.h + 100) continue;
      const side = i % 2 ? 1 : -1;
      const x = this.w * .5 + side * (p.half + 70 * p.scale);
      const y = p.y - 28 * p.scale;
      ctx.save();
      ctx.globalAlpha = clamp(.22 + p.t * .55, 0, .75);
      const g = ctx.createLinearGradient(x, y, x, y + 65 * p.scale);
      g.addColorStop(0, 'rgba(140,127,200,.85)');
      g.addColorStop(1, 'rgba(40,34,77,.06)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 36 * p.scale, 11 * p.scale, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 28 * p.scale, y + 4 * p.scale);
      ctx.lineTo(x + 28 * p.scale, y + 4 * p.scale);
      ctx.lineTo(x + 7 * p.scale, y + 55 * p.scale);
      ctx.lineTo(x - 5 * p.scale, y + 62 * p.scale);
      ctx.closePath();
      ctx.fillStyle = 'rgba(42,34,77,.56)';
      ctx.fill();
      ctx.restore();
    }
  };

