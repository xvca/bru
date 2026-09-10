import { z } from 'zod'
import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import {
	generateDeviceToken,
	revokeDeviceTokens,
} from '@/services/deviceTokenService'

const deviceSchema = z.object({ deviceName: z.string().max(100).optional() })

export default withLocalAccess(
	createApiHandler({
		POST: async (req, res) => {
			const { deviceName } = deviceSchema.parse(req.body)
			res.status(201).json(await generateDeviceToken(deviceName))
		},
		DELETE: async (_req, res) => {
			await revokeDeviceTokens()
			res.status(204).end()
		},
	}),
)
