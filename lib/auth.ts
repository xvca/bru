import { NextApiRequest, NextApiResponse } from 'next'

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AuthRequest extends NextApiRequest {
	user?: {
		id: number
		username: string
	}
}

export function withAuth(
	handler: (req: AuthRequest, res: NextApiResponse) => Promise<void>,
) {
	return async (req: AuthRequest, res: NextApiResponse) => {
		try {
			const authHeader = req.headers.authorization

			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return res.status(401).json({ error: 'Unauthorized' })
			}

			const token = authHeader.substring(7)
			const decoded = jwt.verify(token, JWT_SECRET) as {
				id: number
				username: string
			}

			req.user = {
				id: decoded.id,
				username: decoded.username,
			}

			return handler(req, res)
		} catch (error) {
			console.error('Auth error:', error)
			return res.status(401).json({ error: 'Unauthorized' })
		}
	}
}
