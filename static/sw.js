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
        await cache.addAll(["/"]);
        self.skipWaiting();
    })());
});

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        const r = await caches.match(e.request);
        if (r) return r;
        return fetch(e.request)
            .then(async (response) => {
                if (e.request.credentials == "same-origin" && e.request.destination == "") {
                    return response;
                } else {
                    return caches.open("{{ hash }}")
                        .then(function (cache) {
                            console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
                            cache.put(e.request, response.clone());
                            return response;
                        });
                }
            })
            .catch(async (err) => {
                console.log(err);
                return new Response("503 (Service Unavailable)", { "status": 503, "statusText": "offline" });
            });
    })());
});