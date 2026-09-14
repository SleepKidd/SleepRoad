'use strict';
try{new window.SleepRoad3D();}catch(err){console.error(err);window.SleepRoadSystems.UI.fatal.classList.remove('hidden');}
if('serviceWorker'in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
