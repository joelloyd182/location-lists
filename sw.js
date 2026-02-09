// Service Worker for Location Lists
const CACHE_NAME = 'location-lists-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// Install service worker and cache assets (skip errors for missing files)
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Try to cache each file individually, ignore failures
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
          )
        );
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate immediately
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => fetch(event.request)) // Fallback to network if cache fails
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const storeId = event.notification.data?.storeId;
  const url = storeId ? `/?store=${storeId}` : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus().then(client => {
              // Post message to client to show the store
              if (storeId) {
                client.postMessage({ type: 'SHOW_STORE', storeId });
              }
            });
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle messages from main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_LOCATION') {
    const { position, stores } = event.data;
    checkNearbyStores(position, stores);
  }
});

// Check if user is near any stores and send notification
function checkNearbyStores(position, stores) {
  stores.forEach(store => {
    const distance = calculateDistance(
      position.lat,
      position.lng,
      store.location.lat,
      store.location.lng
    );
    
    // If within trigger radius and haven't notified recently
    if (distance <= store.triggerRadius) {
      const notificationKey = `notified_${store.id}`;
      const lastNotified = parseInt(localStorage.getItem(notificationKey) || '0');
      const now = Date.now();
      
      // Only notify once per hour for same store
      if (now - lastNotified > 3600000) {
        sendNotification(store, Math.round(distance));
        localStorage.setItem(notificationKey, now.toString());
      }
    }
  });
}

// Send notification
function sendNotification(store, distance) {
  const options = {
    body: `You're ${distance}m away. Tap to see your list.`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `store-${store.id}`,
    data: {
      storeId: store.id
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };
  
  self.registration.showNotification(`📍 Near ${store.name}!`, options);
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
