// Service Worker for Student Budget Tracker PWA
// Provides offline caching while allowing Firebase Auth & Firestore to work normally

const CACHE_NAME = 'student-budget-v4-fixed';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/main.js',
  '/auth.js',
  '/dashboard.js',
  '/budget.js',
  '/expense.js',
  '/history.js',
  '/savings.js',
  '/notifications.js',
  '/firebase-config.js',
  '/firestore-sync.js'
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Cache all static assets, continue on error for missing files
        return Promise.allSettled(
          STATIC_ASSETS.map(asset =>
            cache.add(asset).catch(() => {
              console.log(`[Service Worker] Could not cache ${asset}, may not exist yet`);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Force service worker to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For Firebase API calls and external APIs, use network-first strategy
  if (url.pathname.includes('firebaseio.com') || 
      url.pathname.includes('googleapis.com') ||
      url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If offline and no cache available, return offline response
          return caches.match(request)
            .then(response => response || createOfflineResponse());
        })
    );
    return;
  }

  // For static assets (HTML, CSS, JS), use cache-first strategy
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Return cached version if available
          if (response) {
            return response;
          }

          // Otherwise, fetch from network
          return fetch(request)
            .then((response) => {
              // Don't cache if not a success response
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              // Cache the new response
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // If offline and asset not in cache, return offline page
              return caches.match('/index.html')
                .then(response => response || createOfflineResponse());
            });
        })
    );
    return;
  }

  // For other requests (POST, etc.), just pass through to network
  event.respondWith(fetch(request));
});

// Create a simple offline response
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .offline-message {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin: 0 0 1rem 0; }
        p { color: #666; margin: 0; }
      </style>
    </head>
    <body>
      <div class="offline-message">
        <h1>You're Offline</h1>
        <p>Student Budget Tracker is loading cached content.</p>
        <p>Some features may be limited until you reconnect.</p>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8'
      })
    }
  );
}

// Handle background sync (optional - for syncing data when back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(
      // Notify the client to sync data when back online
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_EXPENSES',
            message: 'Connection restored, syncing your data...'
          });
        });
      })
    );
  }
});

// Handle push notifications (optional - for budget alerts)
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'Student Budget Alert',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%234361ee" width="192" height="192" rx="45"/><text x="96" y="96" font-size="60" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif" font-weight="bold">$</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%234361ee" width="96" height="96" rx="24"/><text x="48" y="48" font-size="40" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif">$</text></svg>',
    tag: 'budget-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Student Budget', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If a window is already open, focus it
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].url === '/' && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[Service Worker] Loaded successfully');
