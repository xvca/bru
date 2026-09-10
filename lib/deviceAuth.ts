import type { NextApiRequest, NextApiResponse } from 'next'
import {
	validateDeviceToken,
	updateTokenLastUsed,
} from '@/services/deviceTokenService'

export interface DeviceRequest extends NextApiRequest {
	deviceTokenId?: number
}

export function withDeviceAuth(
	handler: (req: DeviceRequest, res: NextApiResponse) => Promise<void>,
) {
	return async (req: DeviceRequest, res: NextApiResponse) => {
		if (process.env.NEXT_PUBLIC_LITE === 'true') return res.status(404).end()
		try {
			const authHeader = req.headers.authorization
			if (!authHeader?.startsWith('Bearer ')) {
				return res.status(401).json({ error: 'Unauthorized' })
			}

			const token = authHeader.slice(7)
			const validation = await validateDeviceToken(token)
			if (!validation) {
				return res.status(401).json({ error: 'Invalid token' })
			}

			req.deviceTokenId = validation.id
			await updateTokenLastUsed(token)
			return handler(req, res)
		} catch (error) {
			console.error('Device auth error:', error)
			return res.status(401).json({ error: 'Unauthorized' })
		}
	}
}
