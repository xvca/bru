import axios from 'axios'

function isLocalApiRequest(config: { url?: string; baseURL?: string }) {
	try {
		const url = new URL(
			config.url ?? '',
			config.baseURL
				? new URL(config.baseURL, window.location.origin)
				: window.location.origin,
		)
		return (
			url.origin === window.location.origin && url.pathname.startsWith('/api/')
		)
	} catch {
		return false
	}
}

export function installApiRequestInterceptor() {
	const interceptor = axios.interceptors.request.use((config) => {
		if (
			isLocalApiRequest(config) &&
			!['get', 'head', 'options'].includes(config.method ?? 'get')
		) {
			config.headers.set('X-Bru-Request', '1')
		}
		return config
	})
	return () => axios.interceptors.request.eject(interceptor)
}
