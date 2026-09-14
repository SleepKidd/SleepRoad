'use strict';

SleepRoadGame.prototype.render = function() {
    const shakeX = this.cameraShake > 0 ? rand(-this.cameraShake, this.cameraShake) : 0;
    const shakeY = this.cameraShake > 0 ? rand(-this.cameraShake * .45, this.cameraShake * .45) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawSky();
    this.drawRoad();
    this.drawWorld();
    this.drawPlayerCrowd();
    this.drawParticles();
    this.drawForegroundGlow();
    ctx.restore();

    if (this.flash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(${this.flashTint},${this.flash * .42})`;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }
  };

