import { NextApiRequest, NextApiResponse } from 'next'

import { authenticateSession } from '@/services/sessionService'
import {
	SESSION_COOKIE,
	isSafeSessionRequest,
	setSessionCookie,
} from '@/lib/session'
import {
	validateDeviceToken,
	updateTokenLastUsed,
} from '@/services/deviceTokenService'

export interface AuthRequest extends NextApiRequest {
	user?: {
		id: number
		username: string
		barId?: number
	}
}

export function withAuth(
	handler: (req: AuthRequest, res: NextApiResponse) => Promise<void>,
) {
	return async (req: AuthRequest, res: NextApiResponse) => {
		res.setHeader('Cache-Control', 'private, no-store')
		if (process.env.NEXT_PUBLIC_LITE === 'true') return res.status(404).end()
		if (!isSafeSessionRequest(req))
			return res.status(403).json({ error: 'Invalid request origin' })
		try {
			const session = await authenticateSession(req.cookies[SESSION_COOKIE])
			if (!session) {
				return res
					.status(401)
					.json({ error: 'Unauthorized', code: 'SESSION_INVALID' })
			}
			req.user = session.user
			if (session.renew)
				setSessionCookie(
					req,
					res,
					req.cookies[SESSION_COOKIE]!,
					session.expiresAt,
				)
		} catch (error) {
			console.error('Session verification failed:', error)
			return res
				.status(503)
				.json({ error: 'Unable to check session; please retry' })
		}
		return handler(req, res)
	}
}

export function withDeviceAuth(
	handler: (req: AuthRequest, res: NextApiResponse) => Promise<void>,
) {
	return async (req: AuthRequest, res: NextApiResponse) => {
		try {
			const authHeader = req.headers.authorization

			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return res.status(401).json({ error: 'Unauthorized' })
			}

			const token = authHeader.substring(7)
			const validation = await validateDeviceToken(token)

			if (!validation) {
				return res.status(401).json({ error: 'Invalid token' })
			}

			req.user = {
				id: validation.userId,
				username: validation.username,
				barId: validation.barId,
			}

			await updateTokenLastUsed(token)

			return handler(req, res)
		} catch (error) {
			console.error('Device auth error:', error)
			return res.status(401).json({ error: 'Unauthorized' })
		}
	}
}
