import type { NextApiRequest, NextApiResponse } from 'next'
import { isSafeSessionRequest } from '@/lib/session'

export function authRoute(
	method: 'GET' | 'POST',
	handler: (
		req: NextApiRequest,
		res: NextApiResponse,
	) => unknown | Promise<unknown>,
) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		res.setHeader('Cache-Control', 'private, no-store')
		if (process.env.NEXT_PUBLIC_LITE === 'true') return res.status(404).end()
		if (req.method !== method) {
			res.setHeader('Allow', method)
			return res.status(405).end()
		}
		if (!isSafeSessionRequest(req))
			return res.status(403).json({ error: 'Invalid request origin' })
		try {
			return await handler(req, res)
		} catch (error) {
			console.error('Session request failed:', error)
			return res
				.status(503)
				.json({ error: 'Unable to complete request; please retry' })
		}
	}
}
