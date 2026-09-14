'use strict';

SleepRoadGame.prototype.drawRoad = function() {
    const h = this.horizonY;
    const leftBottom = this.w * .5 - this.roadBottomHalf;
    const rightBottom = this.w * .5 + this.roadBottomHalf;
    const leftTop = this.w * .5 - this.roadHorizonHalf;
    const rightTop = this.w * .5 + this.roadHorizonHalf;

    const rg = ctx.createLinearGradient(0, h, 0, this.h);
    rg.addColorStop(0, 'rgba(225,222,255,.58)');
    rg.addColorStop(.35, 'rgba(175,171,215,.78)');
    rg.addColorStop(1, 'rgba(103,99,141,.92)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(leftTop, h);
    ctx.lineTo(rightTop, h);
    ctx.lineTo(rightBottom, this.bottomY);
    ctx.lineTo(leftBottom, this.bottomY);
    ctx.closePath();
    ctx.fill();

    const innerLeftTop = this.w * .5 - this.roadHorizonHalf * .91;
    const innerRightTop = this.w * .5 + this.roadHorizonHalf * .91;
    const innerBottomHalf = this.roadBottomHalf * .925;
    const ig = ctx.createLinearGradient(0, h, 0, this.h);
    ig.addColorStop(0, 'rgba(250,248,255,.72)');
    ig.addColorStop(.5, 'rgba(231,228,244,.90)');
    ig.addColorStop(1, 'rgba(241,239,248,.98)');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.moveTo(innerLeftTop, h);
    ctx.lineTo(innerRightTop, h);
    ctx.lineTo(this.w * .5 + innerBottomHalf, this.bottomY);
    ctx.lineTo(this.w * .5 - innerBottomHalf, this.bottomY);
    ctx.closePath();
    ctx.fill();

    const glowL = ctx.createLinearGradient(leftBottom, 0, this.w * .5, 0);
    glowL.addColorStop(0, 'rgba(172,150,255,.35)');
    glowL.addColorStop(1, 'rgba(172,150,255,0)');
    ctx.fillStyle = glowL;
    ctx.beginPath();
    ctx.moveTo(leftTop - 4, h);
    ctx.lineTo(leftTop + 4, h);
    ctx.lineTo(leftBottom + 26, this.bottomY);
    ctx.lineTo(leftBottom - 10, this.bottomY);
    ctx.closePath();
    ctx.fill();

    const stripeStep = 18;
    const phase = this.travel % stripeStep;
    for (let z = phase; z < this.viewDistance; z += stripeStep) {
      const z2 = Math.min(this.viewDistance, z + 4.8);
      const p1 = this.project(0, z);
      const p2 = this.project(0, z2);
      if (p1.y <= this.horizonY + 2) continue;
      const a = clamp(.05 + p1.t * .14, .04, .19);
      ctx.fillStyle = `rgba(89,84,118,${a})`;
      ctx.beginPath();
      ctx.moveTo(this.w * .5 - p2.half * .80, p2.y);
      ctx.lineTo(this.w * .5 + p2.half * .80, p2.y);
      ctx.lineTo(this.w * .5 + p1.half * .80, p1.y);
      ctx.lineTo(this.w * .5 - p1.half * .80, p1.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(180,163,255,.25)';
    ctx.lineWidth = 1;
    for (const laneX of [-.33, .33]) {
      ctx.beginPath();
      for (let z = this.viewDistance; z >= 0; z -= 4) {
        const p = this.project(laneX, z);
        if (z === this.viewDistance) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  };

