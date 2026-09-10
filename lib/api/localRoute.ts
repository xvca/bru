import type { NextApiRequest, NextApiResponse } from 'next'
import { isSafeRequest } from '@/lib/requestSecurity'

export function withLocalAccess<Req extends NextApiRequest = NextApiRequest>(
	handler: (req: Req, res: NextApiResponse) => Promise<unknown>,
) {
	return async (req: Req, res: NextApiResponse) => {
		res.setHeader('Cache-Control', 'private, no-store')
		if (process.env.NEXT_PUBLIC_LITE === 'true') return res.status(404).end()
		if (!isSafeRequest(req)) {
			return res.status(403).json({ error: 'Invalid request origin' })
		}
		return handler(req, res)
	}
}
