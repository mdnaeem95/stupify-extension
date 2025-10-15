/// <reference lib="webworker" />
/**
 * Service Worker Cache Configuration
 * 
 * Implements caching strategies for offline support:
 * - Cache-first for static assets (JS, CSS, images)
 * - Network-first for API calls with offline fallback
 * - Stale-while-revalidate for semi-static content
 * 
 * This runs in the background service worker context
 */

declare const self: ServiceWorkerGlobalScope;

// Cache Names
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `stupify-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `stupify-dynamic-${CACHE_VERSION}`;
const API_CACHE = `stupify-api-${CACHE_VERSION}`;

// Cache Sizes
const MAX_DYNAMIC_ITEMS = 50;
const MAX_API_ITEMS = 100;

// URLs to pre-cache
const STATIC_ASSETS = [
  '/',
  '/sidepanel.html',
  '/popup.html',
  '/settings.html',
  '/onboarding.html',
  // Note: Built assets will be added dynamically
];

/**
 * Install Event - Pre-cache static assets
 */
self.addEventListener('install', (event: any) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache: any) => {
      console.log('📦 Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('✅ Service Worker: Installed');
      return self.skipWaiting(); // Activate immediately
    })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event: any) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName.startsWith('stupify-') && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE) {
            console.log(`🗑️  Service Worker: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim(); // Take control immediately
    })
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension:// URLs
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Network-first for API calls
  if (isApiCall(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy 3: Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

/**
 * Strategy: Cache-First
 * Best for: Static assets that rarely change
 */
async function cacheFirst(request: any, cacheName: any) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Not in cache - fetch from network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('❌ Cache-first failed:', error);
    
    // Return cached response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page or error
    return createOfflineResponse();
  }
}

/**
 * Strategy: Network-First
 * Best for: API calls that need fresh data
 */
async function networkFirst(request: any, cacheName: any) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      
      // Limit cache size
      limitCacheSize(cacheName, MAX_API_ITEMS);
    }

    return response;
  } catch (error) {
    console.warn('📡 Network unavailable, using cache:', error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cached-Response', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }

    // No cache available - return error
    return createOfflineResponse();
  }
}

/**
 * Strategy: Stale-While-Revalidate
 * Best for: Content that can be slightly stale
 */
async function staleWhileRevalidate(request: any, cacheName: any) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      limitCacheSize(cacheName, MAX_DYNAMIC_ITEMS);
    }
    return response;
  }).catch(() => {
    // Network error - return cached if available
    return cachedResponse;
  });

  // Return cached immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName: any, maxItems: any) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Remove oldest items
    const itemsToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(itemsToDelete.map(key => cache.delete(key)));
  }
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url: any) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/i);
}

/**
 * Check if URL is an API call
 */
function isApiCall(url: any) {
  return url.hostname === 'stupify.ai' || 
         url.hostname.includes('supabase.co') ||
         url.pathname.includes('/api/');
}

/**
 * Create offline response
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Please check your connection.',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Clear all caches (for debugging)
 */
export async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('🗑️  All caches cleared');
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<Record<string, number>> {
  const cacheNames = await caches.keys();
  const stats: Record<string, number> = {}; // 👈 typed

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length; // ok
  }

  return stats;
}


// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clearAllCaches,
    getCacheStats,
  };
}