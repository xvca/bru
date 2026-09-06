export interface EspIntegration {
	configured: boolean
	barId: number | null
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

	const barId = 'barId' in value ? value.barId : null
	return {
		configured: value.configured,
		barId:
			value.configured &&
			typeof barId === 'number' &&
			Number.isSafeInteger(barId) &&
			barId > 0 &&
			barId <= 2147483647
				? barId
				: null,
		apiUrl:
			value.configured && 'apiUrl' in value && typeof value.apiUrl === 'string'
				? value.apiUrl
				: '',
	}
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
