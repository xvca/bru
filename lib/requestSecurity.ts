import type { NextApiRequest } from 'next'

export function isSafeRequest(req: NextApiRequest) {
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '')) return true
	if (
		req.headers['x-bru-request'] !== '1' ||
		req.headers['sec-fetch-site'] === 'cross-site'
	) {
		return false
	}
	if (!req.headers.origin) return true

	try {
		const expected = process.env.APP_ORIGIN ?? `http://${req.headers.host}`
		return new URL(req.headers.origin).host === new URL(expected).host
	} catch {
		return false
	}
}
