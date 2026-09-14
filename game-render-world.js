'use strict';

SleepRoadGame.prototype.drawWorld = function() {
    const visible = [];
    for (const obj of this.objects) {
      if (obj.hit && obj !== this.battle) continue;
      const z = obj.distance - this.travel;
      if (z < -8 || z > this.viewDistance + 10) continue;
      visible.push({ obj, z });
    }
    visible.sort((a, b) => b.z - a.z);

    for (const item of visible) {
      const { obj, z } = item;
      if (obj.type === 'gate') this.drawGate(obj, z);
      else if (obj.type === 'moon') this.drawMoon(obj, z);
      else if (obj.type === 'shield') this.drawShield(obj, z);
      else if (obj.type === 'obstacle') this.drawObstacle(obj, z);
      else if (obj.type === 'enemy') this.drawEnemy(obj, z);
      else if (obj.type === 'finish') this.drawFinish(obj, z);
    }
  };

