'use strict';
const CACHE='sleep-road-v20';
const ASSETS=['./','./index.html','./style.css','./animation-v5.css','./polish-v6.css','./menu-v7.css','./environment-v8.css','./visual-v9.css','./engine.js','./assets/models/countmaster-character.js','./systems-v4.js','./level-director-v5.js','./gameplay-v4.js','./level-runtime-v5.js','./render-v4.js','./render-levels-v5.js','./animation-v5.js','./progression-v6.js','./audio-v6.js','./quality-v6.js','./polish-v6.js','./menu-v7.js','./environment-v8.js','./visual-v9.js','./boot-v4.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
