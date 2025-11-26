self.addEventListener('install', () => {
	// Skip waiting allows the new service worker to take over immediately
	self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
	// We just need this listener to exist to satisfy PWA requirements
	// We won't actually cache anything here, so your app works like a normal website
})
