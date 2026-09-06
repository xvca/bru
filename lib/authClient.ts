import axios, { type InternalAxiosRequestConfig } from 'axios'

export interface SessionUser {
	id: number
	username: string
}

type SessionRequest = InternalAxiosRequestConfig & {
	bruSessionVersion?: number
}

export function isBruApiRequest(
	config: { url?: string; baseURL?: string },
	origin: string,
) {
	try {
		const url = new URL(
			config.url ?? '',
			config.baseURL ? new URL(config.baseURL, origin) : origin,
		)
		return url.origin === origin && url.pathname.startsWith('/api/')
	} catch {
		return false
	}
}

export function installSessionInterceptors(
	getVersion: () => number,
	onInvalidSession: () => void,
) {
	const request = axios.interceptors.request.use((config: SessionRequest) => {
		if (isBruApiRequest(config, window.location.origin)) {
			config.bruSessionVersion = getVersion()
			if (!['get', 'head', 'options'].includes(config.method ?? 'get')) {
				config.headers.set('X-Bru-Request', '1')
			}
		}
		return config
	})
	const response = axios.interceptors.response.use(undefined, (error) => {
		const config = error.config as SessionRequest | undefined
		if (
			config &&
			isBruApiRequest(config, window.location.origin) &&
			error.response?.status === 401 &&
			error.response?.data?.code === 'SESSION_INVALID' &&
			config.bruSessionVersion === getVersion()
		) {
			onInvalidSession()
		}
		return Promise.reject(error)
	})
	return () => {
		axios.interceptors.request.eject(request)
		axios.interceptors.response.eject(response)
	}
}
