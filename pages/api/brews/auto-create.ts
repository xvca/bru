import type { NextApiResponse } from 'next'
import { z } from 'zod'
import { type DeviceRequest, withDeviceAuth } from '@/lib/deviceAuth'
import { createAutoBrewFromDevice } from '@/services/autoBrewService'

const autoBrewSchema = z.object({
	yieldWeight: z.number().positive(),
	brewTime: z.number().int().nonnegative(),
	isDecaf: z.boolean(),
})

async function handler(req: DeviceRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const brew = await createAutoBrewFromDevice(autoBrewSchema.parse(req.body))
		res.status(201).json({ id: brew.id, message: 'Brew created successfully' })
	} catch (error) {
		console.error('Auto-create brew error:', error)
		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: 'Invalid request data' })
		}
		if (error instanceof Error) {
			return res.status(400).json({ error: error.message })
		}
		res.status(500).json({ error: 'Failed to create brew' })
	}
}

export default withDeviceAuth(handler)
