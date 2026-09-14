'use strict';

SleepRoadGame.prototype.drawGate = function(obj, z) {
    if (z < 1) return;
    const pL = this.project(-.43, z, .72);
    const pR = this.project(.43, z, .72);
    const gateScale = Math.max(.28, pL.scale);
    const width = Math.max(42, pL.half * .74);
    const height = Math.max(30, 65 * gateScale);
    this.drawGatePanel(pL.x, pL.y, width, height, obj.left, gateScale, obj.phase);
    this.drawGatePanel(pR.x, pR.y, width, height, obj.right, gateScale, obj.phase + 1.2);

    const floor = this.project(0, z, 0);
    ctx.save();
    ctx.strokeStyle = `rgba(149,127,255,${.22 + floor.t * .28})`;
    ctx.lineWidth = Math.max(1, 2 * floor.scale);
    ctx.beginPath();
    ctx.moveTo(this.w * .5, floor.y - height * .70);
    ctx.lineTo(this.w * .5, floor.y + 4);
    ctx.stroke();
    ctx.restore();
  };


SleepRoadGame.prototype.drawGatePanel = function(x, y, width, height, option, scale, phase) {
    const positive = option.op !== 'sub';
    const pulse = .75 + .25 * Math.sin(this.time * 2.4 + phase);
    const glow = positive ? `rgba(120,247,213,${.18 * pulse})` : `rgba(255,112,145,${.18 * pulse})`;
    const fill = positive ? 'rgba(76,199,178,.43)' : 'rgba(212,75,113,.43)';
    const border = positive ? 'rgba(179,255,235,.85)' : 'rgba(255,184,201,.85)';

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18 * scale;
    ctx.fillStyle = fill;
    this.roundRect(x - width / 2, y - height / 2, width, height, 10 * scale);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(1, 1.6 * scale);
    this.roundRect(x - width / 2, y - height / 2, width, height, 10 * scale);
    ctx.stroke();

    const label = option.op === 'mul' ? `×${option.value}` : option.op === 'add' ? `+${option.value}` : `−${option.value}`;
    ctx.fillStyle = '#f9fbff';
    ctx.font = `900 ${clamp(22 * scale, 12, 30)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(5,8,24,.7)';
    ctx.shadowBlur = 5;
    ctx.fillText(label, x, y + 1);
    ctx.restore();
  };


SleepRoadGame.prototype.drawMoon = function(obj, z) {
    if (z < 0) return;
    const p = this.project(obj.x, z, .42 + Math.sin(this.time * 3 + obj.bob) * .08);
    const r = clamp(13 * p.scale, 4, 17);
    ctx.save();
    ctx.shadowColor = 'rgba(255,229,155,.55)';
    ctx.shadowBlur = 18 * p.scale;
    ctx.fillStyle = '#ffe6a3';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d4b85f';
    ctx.beginPath(); ctx.arc(p.x + r * .28, p.y - r * .18, r * .78, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2749';
    ctx.beginPath(); ctx.arc(p.x + r * .55, p.y - r * .28, r * .67, 0, TAU); ctx.fill();
    ctx.restore();
  };


SleepRoadGame.prototype.drawShield = function(obj, z) {
    const p = this.project(obj.x, z, .55 + Math.sin(this.time * 2.6 + obj.bob) * .08);
    const r = clamp(20 * p.scale, 7, 25);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.time * .5);
    ctx.shadowColor = 'rgba(155,216,255,.65)';
    ctx.shadowBlur = 22 * p.scale;
    ctx.strokeStyle = '#b8e2ff';
    ctx.fillStyle = 'rgba(114,186,255,.18)';
    ctx.lineWidth = Math.max(1, 2.4 * p.scale);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * TAU / 6;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-this.time * .5);
    ctx.font = `900 ${clamp(16 * p.scale, 8, 20)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eaf7ff';
    ctx.fillText('✦', 0, 1);
    ctx.restore();
  };


SleepRoadGame.prototype.drawObstacle = function(obj, z) {
    const p = this.project(0, z, 0);
    if (obj.obstacle === 'gap') {
      const leftEnd = obj.gapX - obj.gapWidth;
      const rightStart = obj.gapX + obj.gapWidth;
      this.drawBarrierSegment(-.86, leftEnd, z, p.scale);
      this.drawBarrierSegment(rightStart, .86, z, p.scale);
      return;
    }

    if (obj.obstacle === 'spinner') {
      const x = Math.sin(this.time * obj.speed + obj.phase) * obj.motion;
      const q = this.project(x, z, .18);
      const r = clamp(35 * q.scale, 8, 46);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(this.time * 2.7 + obj.phase);
      ctx.shadowColor = 'rgba(255,104,140,.42)'; ctx.shadowBlur = 16 * q.scale;
      ctx.strokeStyle = '#d85079'; ctx.lineWidth = Math.max(2, 8 * q.scale); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.fillStyle = '#ffd0dc'; ctx.beginPath(); ctx.arc(0, 0, Math.max(4, 7 * q.scale), 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }

    const pulse = .5 + .5 * Math.sin(this.time * 4 + obj.phase);
    const q = this.project(obj.x, z, .28);
    const w = clamp(52 * q.scale, 14, 68);
    const h = clamp((42 + pulse * 35) * q.scale, 14, 80);
    ctx.save();
    ctx.shadowColor = 'rgba(255,107,142,.45)'; ctx.shadowBlur = 18 * q.scale;
    const og = ctx.createLinearGradient(q.x, q.y - h, q.x, q.y);
    og.addColorStop(0, 'rgba(255,151,175,.94)'); og.addColorStop(1, 'rgba(131,47,82,.96)');
    ctx.fillStyle = og;
    this.roundRect(q.x - w / 2, q.y - h, w, h, 6 * q.scale); ctx.fill();
    ctx.restore();
  };


SleepRoadGame.prototype.drawBarrierSegment = function(fromX, toX, z, scale) {
    if (toX <= fromX) return;
    const a = this.project(fromX, z, .32);
    const b = this.project(toX, z, .32);
    const floorA = this.project(fromX, z, 0);
    const floorB = this.project(toX, z, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(255,102,139,.82)';
    ctx.shadowColor = 'rgba(255,90,126,.35)'; ctx.shadowBlur = 12 * scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(floorB.x, floorB.y); ctx.lineTo(floorA.x, floorA.y); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,229,.75)'; ctx.lineWidth = Math.max(1, 1.5 * scale); ctx.stroke();
    ctx.restore();
  };


SleepRoadGame.prototype.drawEnemy = function(enemy, z) {
    const count = Math.max(0, Math.round(enemy.count));
    if (!count) return;
    const labelP = this.project(enemy.x, z + 1, 1.25);
    this.drawCrowd(enemy.x, z, count, false, enemy.pulse);
    const scale = labelP.scale;
    const width = clamp(48 * scale, 30, 64);
    const height = clamp(28 * scale, 20, 36);
    ctx.save();
    ctx.fillStyle = 'rgba(192,64,96,.92)';
    this.roundRect(labelP.x - width / 2, labelP.y - height / 2, width, height, 8 * scale); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${clamp(17 * scale, 12, 21)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(count), labelP.x, labelP.y + 1);
    ctx.restore();
  };


SleepRoadGame.prototype.drawFinish = function(obj, z) {
    if (z < -1) return;
    const p = this.project(0, z, .7);
    const left = this.project(-.78, z, 0);
    const right = this.project(.78, z, 0);
    const topLeft = this.project(-.78, z, 1.55);
    const topRight = this.project(.78, z, 1.55);
    ctx.save();
    ctx.strokeStyle = 'rgba(213,197,255,.95)';
    ctx.lineWidth = Math.max(2, 6 * p.scale);
    ctx.shadowColor = 'rgba(175,145,255,.55)'; ctx.shadowBlur = 18 * p.scale;
    ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(topLeft.x, topLeft.y); ctx.moveTo(right.x, right.y); ctx.lineTo(topRight.x, topRight.y); ctx.stroke();
    ctx.shadowBlur = 0;
    const segments = 10;
    for (let i = 0; i < segments; i++) {
      const xa = lerp(topLeft.x, topRight.x, i / segments);
      const xb = lerp(topLeft.x, topRight.x, (i + 1) / segments);
      ctx.fillStyle = i % 2 ? '#f5f0ff' : '#6d5b91';
      ctx.fillRect(xa, topLeft.y - 8 * p.scale, xb - xa + 1, 16 * p.scale);
    }
    ctx.fillStyle = '#fff'; ctx.font = `900 ${clamp(18 * p.scale, 10, 24)}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('SLEEP ROAD', p.x, p.y - 42 * p.scale);
    ctx.restore();
  };


SleepRoadGame.prototype.drawPlayerCrowd = function() {
    if (this.state === 'menu') return;
    const count = Math.max(0, Math.round(this.visualCount));
    if (!count) return;
    this.drawCrowd(this.playerX, 6.2, count, true, 0);

    if (this.shield > 0) {
      const p = this.project(this.playerX, 6.3, .38);
      const r = clamp(66 + Math.sqrt(count) * 2.2, 70, 115) * p.scale;
      ctx.save();
      ctx.strokeStyle = `rgba(175,226,255,${.48 + .16 * Math.sin(this.time * 4)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(128,202,255,.55)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .43, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  };


SleepRoadGame.prototype.drawCrowd = function(centerX, baseZ, count, player, phase = 0) {
    const maxDraw = Math.min(count, this.w < 520 ? 92 : 125);
    const cols = Math.ceil(Math.sqrt(maxDraw * 1.25));
    const rows = Math.ceil(maxDraw / cols);
    const density = clamp(.050 - Math.min(count, 220) * .00005, .035, .05);
    const members = [];

    for (let i = 0; i < maxDraw; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rowCount = Math.min(cols, maxDraw - row * cols);
      const offset = col - (rowCount - 1) / 2;
      const jitter = Math.sin(i * 12.9898 + phase) * .009;
      const x = centerX + offset * density + jitter;
      const z = baseZ + row * .58 + (Math.cos(i * 4.2 + phase) * .07);
      members.push({ x, z, i });
    }
    members.sort((a, b) => b.z - a.z);

    const palettePlayer = ['#6ce0b4', '#74efbf', '#54cfa1'];
    const paletteEnemy = ['#ef617f', '#f5738e', '#d84f70'];
    const palette = player ? palettePlayer : paletteEnemy;

    for (const m of members) {
      const p = this.project(m.x, m.z, 0);
      const s = clamp(7.2 * p.scale, 2.7, 10.5);
      const bob = Math.sin(this.time * (player ? 7.5 : 8.3) + m.i * .77 + phase) * s * .10;
      this.drawPerson(p.x, p.y + bob, s, palette[m.i % palette.length], player);
    }
  };


SleepRoadGame.prototype.drawPerson = function(x, y, s, color, player) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(34,26,64,.16)';
    ctx.beginPath(); ctx.ellipse(0, s * .72, s * .75, s * .28, 0, 0, TAU); ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * .34);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, s * .15); ctx.lineTo(-s * .28, s * .72); ctx.moveTo(0, s * .15); ctx.lineTo(s * .31, s * .72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * .02); ctx.lineTo(-s * .5, s * .26); ctx.moveTo(0, -s * .02); ctx.lineTo(s * .5, s * .26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * .30); ctx.lineTo(0, s * .25); ctx.stroke();

    ctx.fillStyle = player ? '#9bffd9' : '#ff9bad';
    ctx.beginPath(); ctx.arc(0, -s * .64, s * .46, 0, TAU); ctx.fill();
    ctx.restore();
  };


SleepRoadGame.prototype.drawParticles = function() {
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  };


SleepRoadGame.prototype.drawForegroundGlow = function() {
    const g = ctx.createLinearGradient(0, this.h * .65, 0, this.h);
    g.addColorStop(0, 'rgba(8,10,28,0)');
    g.addColorStop(1, 'rgba(8,10,28,.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.h * .65, this.w, this.h * .35);
  };


SleepRoadGame.prototype.roundRect = function(x, y, w, h, r) {
    const rr = Math.min(Math.max(0, r), Math.min(w, h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };


SleepRoadGame.prototype.loop = function(now) {
    const dt = clamp((now - this.last) / 1000, 0, .033);
    this.last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  };


const game = new SleepRoadGame();
window.__sleepRoad = game;

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
