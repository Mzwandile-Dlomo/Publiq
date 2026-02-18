const CACHE_NAME = "publiq-v1";

const PRECACHE_URLS = [
    "/",
    "/dashboard",
    "/manifest.json",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
];

// Install — precache app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Skip API routes and auth
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses for static assets
                if (
                    response.ok &&
                    (url.pathname.startsWith("/_next/static/") ||
                        url.pathname.startsWith("/icons/") ||
                        url.pathname === "/manifest.json")
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
