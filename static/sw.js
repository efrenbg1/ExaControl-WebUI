self.addEventListener('install', e => {
    console.log('[Service Worker] Install');
    e.waitUntil((async () => {
        caches.keys().then(function (names) {
            console.log("[Service Worker] Remove old cache");
            for (let name of names) {
                if (name != "{{ hash }}") caches.delete(name);
            }
        });
        console.log('[Service Worker] Create new cache');
        const cache = await caches.open("{{ hash }}");
        await cache.addAll([]);
    })());
});

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        if (r) { return r; }
        const response = await fetch(e.request);
        if (e.request.destination != "") {
            const cache = await caches.open("{{ hash }}");
            console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
            cache.put(e.request, response.clone());
        }
        return response;
    })());
});
