import axios from 'axios'

export async function verifyEspReachable(ip: string): Promise<void> {
	const trimmed = ip.trim()
	const normalized = trimmed.replace(/^https?:\/\//i, '').replace(/\/+$/, '')

	if (!normalized) {
		throw new Error('Please enter a valid IP address or hostname.')
	}

	try {
		const { data } = await axios.get(`http://${normalized}/prefs`, {
			timeout: 4000,
		})

		if (
			typeof data !== 'object' ||
			data === null ||
			typeof data.isEnabled !== 'boolean' ||
			typeof data.regularPreset !== 'number' ||
			typeof data.decafPreset !== 'number'
		) {
			throw new Error('ESP responded with an unexpected payload.')
		}
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const reason =
				error.response?.data?.error ||
				(error.code === 'ECONNABORTED'
					? 'Timed out waiting for a response from the ESP.'
					: error.message)
			throw new Error(reason || `Unable to reach ESP at http://${normalized}.`)
		}

		throw new Error(
			(error as Error)?.message ||
				`Unable to reach ESP at http://${normalized}.`,
		)
	}
}
