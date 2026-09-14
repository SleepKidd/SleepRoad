'use strict';

(() => {
  if (typeof SleepRoad !== 'function') return;
  const proto = SleepRoad.prototype;

  proto.project = function projectV3(x, z, elevation = 0) {
    this.ensureV3Geometry?.();
    const zz = clamp(z, 0, this.viewDistance);
    const t = clamp(1 - zz / this.viewDistance, 0, 1);
    const curve = Math.pow(t, 1.38);
    const half = lerp(this.roadHorizonHalf, this.roadBottomHalf, curve);
    const scale = lerp(.19, 1.44, Math.pow(t, 1.08));
    return { x: this.w * .5 + x * half, y: lerp(this.horizonY, this.bottomY, curve) - elevation * scale * 34, scale, half, t };
  };

  proto.render = function renderV3() {
    this.ensureV3Geometry?.();
    ctx.save();
    const sx = this.cameraShake > 0 ? rand(-this.cameraShake, this.cameraShake) : 0;
    const sy = this.cameraShake > 0 ? rand(-this.cameraShake * .4, this.cameraShake * .4) : 0;
    ctx.translate(sx, sy);
    this.drawSky();
    this.drawRoad();
    this.drawWorld();
    ctx.restore();
    this.drawFallen?.();
    this.drawParticles();
    if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashColor},${this.flash})`; ctx.fillRect(0, 0, this.w, this.h); }
  };

  proto.drawSky = function drawSkyV3() {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#e8c97f');
    g.addColorStop(.52, '#f1dcaa');
    g.addColorStop(1, '#f5f0ea');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    const haze = ctx.createRadialGradient(this.w * .5, this.h * .18, 30, this.w * .5, this.h * .3, this.w * .8);
    haze.addColorStop(0, 'rgba(255,255,255,.18)');
    haze.addColorStop(.55, 'rgba(255,255,255,.04)');
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, this.w, this.h);
    for (const island of this.islandSeed) this.drawIsland(island);
  };

  proto.drawIsland = function drawIslandV3(it) {
    const drift = Math.sin(this.time * .17 + it.phase) * 5;
    const x = it.side < 0 ? this.w * (.06 + .075 * it.size) : this.w * (.94 - .075 * it.size);
    const y = it.y * this.h + drift;
    const s = 56 * it.size;
    ctx.save();
    ctx.globalAlpha = .6;
    ctx.fillStyle = '#4d6aa8';
    ctx.beginPath(); ctx.ellipse(x, y, s * .82, s * .22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#36538f';
    ctx.beginPath(); ctx.moveTo(x - s * .66, y); ctx.lineTo(x + s * .66, y); ctx.lineTo(x + s * .24, y + s * 1.05); ctx.lineTo(x - s * .18, y + s * 1.18); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  proto.drawRoad = function drawRoadV3() {
    const farL = this.roadPoint(-1, this.viewDistance), farR = this.roadPoint(1, this.viewDistance), nearL = this.roadPoint(-1, 0), nearR = this.roadPoint(1, 0);
    const shadow = ctx.createLinearGradient(0, this.horizonY, 0, this.h);
    shadow.addColorStop(0, 'rgba(196,178,170,.20)');
    shadow.addColorStop(1, 'rgba(131,120,143,.08)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, this.horizonY, this.w, this.h - this.horizonY);

    const rg = ctx.createLinearGradient(0, this.horizonY, 0, this.h);
    rg.addColorStop(0, '#f7f7fb'); rg.addColorStop(.55, '#f5f5f8'); rg.addColorStop(1, '#f2f2f5');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(farL.x, farL.y); ctx.lineTo(farR.x, farR.y); ctx.lineTo(nearR.x, nearR.y); ctx.lineTo(nearL.x, nearL.y); ctx.closePath(); ctx.fill();

    const offset = this.travel % 24;
    for (let z = this.viewDistance - offset; z > 2; z -= 24) {
      const z2 = Math.max(0, z - 5.8);
      const a1 = this.roadPoint(-.84, z), b1 = this.roadPoint(.84, z), a2 = this.roadPoint(-.84, z2), b2 = this.roadPoint(.84, z2), p = this.roadPoint(0, z2);
      ctx.fillStyle = `rgba(192,194,201,${.10 + p.t * .075})`;
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(a2.x, a2.y); ctx.closePath(); ctx.fill();
    }

    ctx.strokeStyle = '#b8bdca';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(farL.x, farL.y); ctx.lineTo(nearL.x, nearL.y); ctx.moveTo(farR.x, farR.y); ctx.lineTo(nearR.x, nearR.y); ctx.stroke();
  };

  proto.drawGate = function drawGateV3(obj, z) {
    const left = this.project(-.49, z), right = this.project(.49, z);
    const h = 62 * left.scale;
    const w = Math.max(46, left.half * .51);
    this.drawGatePanel(left.x, left.y - h * .18, w, h, obj.left);
    this.drawGatePanel(right.x, right.y - h * .18, w, h, obj.right);
    ctx.strokeStyle = `rgba(72,78,121,${.4 + .45 * left.t})`;
    ctx.lineWidth = Math.max(2, 4 * left.scale);
    ctx.beginPath(); ctx.moveTo(this.w * .5, left.y - h * .66); ctx.lineTo(this.w * .5, left.y + h * .48); ctx.stroke();
  };

  proto.drawMoon = function drawMoonV3(obj, z) {
    const p = this.project(obj.x, z, .34 + Math.sin(this.time * 3 + obj.bob) * .08);
    const r = (obj.bonus ? 15 : 10.5) * p.scale;
    ctx.save();
    ctx.shadowBlur = 15 * p.scale;
    ctx.shadowColor = 'rgba(255,190,52,.55)';
    const g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .45, r * .15, p.x, p.y, r);
    g.addColorStop(0, '#fff8ba'); g.addColorStop(.35, '#ffd75b'); g.addColorStop(1, '#e79b18');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(175,111,16,.6)'; ctx.lineWidth = Math.max(1, 1.4 * p.scale); ctx.stroke();
    ctx.fillStyle = 'rgba(255,247,188,.98)'; ctx.beginPath(); ctx.arc(p.x - r * .06, p.y, r * .52, 0, TAU); ctx.fill();
    ctx.fillStyle = '#efb02a'; ctx.beginPath(); ctx.arc(p.x + r * .16, p.y - r * .08, r * .48, 0, TAU); ctx.fill();
    ctx.restore();
  };

  proto.drawSpinner = function drawSpinnerV3(obj, z) {
    const p = this.project(0, z, .05), len = p.half * .78, ang = this.time * obj.speed + obj.phase;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.strokeStyle = '#f45a62'; ctx.lineWidth = Math.max(5, 11 * p.scale); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke(); ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(-len * .72, 0); ctx.lineTo(len * .72, 0); ctx.stroke();
    ctx.fillStyle = '#f6f7fb'; ctx.beginPath(); ctx.arc(0, 0, Math.max(6, 11 * p.scale), 0, TAU); ctx.fill(); ctx.restore();
  };

  proto.drawSaw = function drawSawV3(obj, z) {
    const x = obj.x + Math.sin(this.time * obj.speed + obj.phase) * obj.motion;
    const p = this.project(x, z, .02), railL = this.project(x - .25, z, -.01), railR = this.project(x + .25, z, -.01), r = Math.max(10, 18 * p.scale);
    ctx.save(); ctx.strokeStyle = '#9da3bd'; ctx.lineWidth = Math.max(2, 4 * p.scale); ctx.beginPath(); ctx.moveTo(railL.x, railL.y); ctx.lineTo(railR.x, railR.y); ctx.stroke();
    ctx.translate(p.x, p.y); ctx.rotate(this.time * 3.2); ctx.fillStyle = '#e94b4b'; ctx.strokeStyle = '#903040'; ctx.lineWidth = Math.max(1, 2 * p.scale); ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r : r * .66, xx = Math.cos(a) * rr, yy = Math.sin(a) * rr; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5d617e'; ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, TAU); ctx.fill(); ctx.restore();
  };

  proto.drawPusher = function drawPusherV3(obj, z) {
    const p = this.project(obj.side * .72, z, .04), reach = .2 + (.5 + .5 * Math.sin(this.time * obj.speed + obj.phase)) * .44, innerX = obj.side < 0 ? -.72 + reach : .72 - reach, q = this.project(innerX, z, .04);
    const w = Math.abs(q.x - p.x) + 22 * p.scale, h = Math.max(16, 36 * p.scale);
    ctx.save(); ctx.fillStyle = '#5a5c8c'; ctx.fillRect(Math.min(p.x, q.x), p.y - h * .16, w, h * .32); ctx.fillStyle = '#7d63c5'; ctx.beginPath(); ctx.roundRect(q.x - h * .44, p.y - h * .52, h * .88, h, Math.max(4, h * .18)); ctx.fill();
    ctx.fillStyle = '#eb4c56';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(q.x + h * .44, p.y + i * h * .22); ctx.lineTo(q.x + h * .78, p.y + i * h * .22 - h * .12); ctx.lineTo(q.x + h * .78, p.y + i * h * .22 + h * .12); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };

  proto.drawSpikes = function drawSpikesV3(obj, z) {
    for (let i = -2; i <= 2; i++) {
      const x = i * .25; if (Math.abs(x - obj.safeX) < .23) continue;
      const p = this.project(x, z + Math.abs(i) * .8, .02), s = 18 * p.scale;
      ctx.fillStyle = '#ef4f4f'; ctx.strokeStyle = 'rgba(131,51,63,.35)'; ctx.lineWidth = Math.max(1, 1.5 * p.scale); ctx.beginPath(); ctx.moveTo(p.x - s, p.y + s * .55); ctx.lineTo(p.x, p.y - s * 1.3); ctx.lineTo(p.x + s, p.y + s * .55); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c8cedd'; ctx.fillRect(p.x - s * .7, p.y + s * .45, s * 1.4, s * .18);
    }
  };

  proto.drawPillars = function drawPillarsV3(obj, z) {
    for (let i = -3; i <= 3; i++) {
      const x = i * .24 + (obj.stagger && Math.abs(i) % 2 ? .035 : 0); if (obj.gaps.some((g) => Math.abs(x - g) < .24)) continue;
      const depth = Math.abs(i % 2) * 1.3, p = this.project(x, z + depth, .02), w = 24 * p.scale, h = 60 * p.scale;
      const grad = ctx.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0); grad.addColorStop(0, '#b93035'); grad.addColorStop(.45, '#ef5854'); grad.addColorStop(1, '#a82d34');
      ctx.fillStyle = grad; ctx.strokeStyle = 'rgba(119,35,43,.42)'; ctx.lineWidth = Math.max(1, 1.4 * p.scale); ctx.fillRect(p.x - w / 2, p.y - h, w, h);
      ctx.beginPath(); ctx.ellipse(p.x, p.y - h, w * .5, w * .23, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(p.x, p.y, w * .5, w * .23, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(p.x - w * .24, p.y - h * .86, w * .14, h * .62);
    }
  };

  proto.drawEnemy = function drawEnemyV3(obj, z) {
    const p = this.project(obj.x, z, .02), n = Math.min(obj.count, obj.boss ? 80 : 60), scale = p.scale * (obj.boss ? 1.14 : 1), cols = Math.max(3, Math.ceil(Math.sqrt(n) * 1.05)), spacing = 12 * scale;
    for (let i = n - 1; i >= 0; i--) {
      const row = Math.floor(i / cols), col = i % cols, ox = (col - (Math.min(cols, n - row * cols) - 1) / 2) * spacing, oy = row * spacing * .72;
      this.drawPerson(p.x + ox, p.y - oy, scale * .88, obj.boss ? '#f06a49' : '#f27b84', obj.boss ? '#8a3825' : '#8a3a45', Math.sin(this.time * 7 + i * .8), obj.boss ? '#ffd0a8' : '#ffd1d6');
    }
    this.drawCountBubble(p.x, p.y - Math.sqrt(n) * spacing * .8 - 22 * scale, obj.count, obj.boss ? '#cb5431' : '#cf5d69', scale);
  };

  proto.drawPlayerCrowd = function drawPlayerCrowdV3() {
    const formation = this.crowdFormation(this.visualCount), depthSpan = Math.min(12.5, 4.2 + Math.sqrt(Math.max(1, this.visualCount)) * .82);
    const items = formation.map((f, i) => ({ ...f, zWorld: this.playerContactZ + f.z * depthSpan, i })).sort((a, b) => b.zWorld - a.zWorld);
    for (const f of items) {
      const p = this.project(clamp(this.playerX + f.x, -.94, .94), f.zWorld, .02), stride = Math.sin(this.time * 8.2 + f.i * .79), bob = Math.abs(stride) * 1.7 * p.scale;
      this.drawPerson(p.x, p.y - bob, p.scale * 1.23, '#72aef6', '#396db8', stride);
    }
    const anchor = this.project(this.playerX, this.playerContactZ + 1.4, .02);
    this.drawCountBubble(anchor.x, anchor.y - Math.min(102, Math.sqrt(Math.max(1, this.playerCount)) * 18) - 22, this.playerCount, '#4f83cf', 1.08);
  };

  proto.drawPerson = function drawPersonV3(x, y, scale, body, shade, stride = 0, highlight = '#cce7ff') {
    const s = clamp(scale, .38, 1.55), headR = 6.3 * s, torsoW = 8.8 * s, torsoH = 13.5 * s, legLen = 8.4 * s, armSwing = stride * 2.2 * s, legSwing = stride * 2.3 * s;
    ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#24374e'; ctx.beginPath(); ctx.ellipse(x, y + torsoH * .83 + legLen, 8.2 * s, 2.4 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = shade; ctx.lineWidth = Math.max(1.35, 2.35 * s);
    ctx.beginPath(); ctx.moveTo(x - torsoW * .18, y + torsoH * .46); ctx.lineTo(x - torsoW * .26 + legSwing, y + torsoH * .46 + legLen); ctx.moveTo(x + torsoW * .18, y + torsoH * .46); ctx.lineTo(x + torsoW * .26 - legSwing, y + torsoH * .46 + legLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - torsoW * .40, y - torsoH * .08); ctx.lineTo(x - torsoW * .72 - armSwing, y + torsoH * .23); ctx.moveTo(x + torsoW * .40, y - torsoH * .08); ctx.lineTo(x + torsoW * .72 + armSwing, y + torsoH * .23); ctx.stroke();
    const tg = ctx.createLinearGradient(x - torsoW, y - torsoH, x + torsoW, y + torsoH); tg.addColorStop(0, highlight); tg.addColorStop(.32, body); tg.addColorStop(1, shade); ctx.fillStyle = tg; ctx.strokeStyle = 'rgba(45,79,126,.58)'; ctx.lineWidth = Math.max(.8, 1.05 * s); ctx.beginPath(); ctx.roundRect(x - torsoW / 2, y - torsoH * .43, torsoW, torsoH, 4.2 * s); ctx.fill(); ctx.stroke();
    const hg = ctx.createRadialGradient(x - headR * .35, y - torsoH * .77 - headR * .78, headR * .15, x, y - torsoH * .70 - headR * .55, headR * 1.08); hg.addColorStop(0, highlight); hg.addColorStop(.38, body); hg.addColorStop(1, shade); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y - torsoH * .70 - headR * .64, headR, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  };

  proto.drawFallen = function drawFallenV3() {
    if (!Array.isArray(this.fallen) || !this.fallen.length) return;
    ctx.save();
    for (const f of this.fallen) {
      const a = clamp(f.life / f.max, 0, 1); ctx.globalAlpha = a; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); const sc = f.scale;
      ctx.strokeStyle = '#3d6fae'; ctx.lineWidth = 2.4 * sc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3 * sc, 3 * sc); ctx.lineTo(-6 * sc, 10 * sc); ctx.moveTo(3 * sc, 3 * sc); ctx.lineTo(6 * sc, 10 * sc); ctx.moveTo(-4 * sc, -2 * sc); ctx.lineTo(-8 * sc, 3 * sc); ctx.moveTo(4 * sc, -2 * sc); ctx.lineTo(8 * sc, 3 * sc); ctx.stroke();
      ctx.fillStyle = '#72aef6'; ctx.beginPath(); ctx.roundRect(-4 * sc, -6 * sc, 8 * sc, 12 * sc, 3 * sc); ctx.fill(); ctx.fillStyle = '#8cc3ff'; ctx.beginPath(); ctx.arc(0, -11 * sc, 6 * sc, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
})();