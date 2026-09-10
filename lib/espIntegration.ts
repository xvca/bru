export interface EspIntegration {
	configured: boolean
	apiUrl: string
}

export function parseEspIntegration(value: unknown): EspIntegration | null {
	if (
		!value ||
		typeof value !== 'object' ||
		!('configured' in value) ||
		typeof value.configured !== 'boolean'
	)
		return null

	if (!value.configured) {
		return { configured: false, apiUrl: '' }
	}

	const apiUrl =
		'apiUrl' in value && typeof value.apiUrl === 'string' ? value.apiUrl : ''

	return { configured: true, apiUrl }
}

export function isSameBruServer(apiUrl: string, origin: string): boolean {
	try {
		const device = new URL(apiUrl)
		const current = new URL(origin)
		return (
			['http:', 'https:'].includes(device.protocol) &&
			device.origin === current.origin &&
			device.pathname.replace(/\/+$/, '') ===
				current.pathname.replace(/\/+$/, '') &&
			!device.search &&
			!device.hash &&
			!device.username &&
			!device.password
		)
	} catch {
		return false
	}
}
