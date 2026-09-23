const CACHE='solocontrol-lab-v0.8.1';
const CORE=['/','/login','/portal-cliente','/mapa','/tanque','/historico','/logo-solocontrol.png','/logo-solocontrol-icon.png','/manifest.webmanifest','/data/villa-arauco-rupturas-final-2026-09-23.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/'))));
});
