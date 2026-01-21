import { NextApiResponse } from 'next'
import { AuthRequest, withDeviceAuth } from '@/lib/auth'
import { createAutoBrewFromDevice } from '@/services/autoBrewService'
import { z } from 'zod'

const autoBrewSchema = z.object({
	yieldWeight: z.number().positive(),
	brewTime: z.number().int().nonnegative(),
	targetWeight: z.number().positive(),
	isDecaf: z.boolean(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const validatedData = autoBrewSchema.parse(req.body)

		const barId = req.user!.barId!
		const userId = req.user!.id

		const brew = await createAutoBrewFromDevice(validatedData, barId, userId)

		return res.status(201).json({
			id: brew.id,
			message: 'Brew created successfully',
		})
	} catch (error) {
		console.error('Auto-create brew error:', error)

		if (error instanceof z.ZodError) {
			return res.status(400).json({ error: 'Invalid request data' })
		}

		if (error instanceof Error) {
			return res.status(400).json({ error: error.message })
		}

		return res.status(500).json({ error: 'Failed to create brew' })
	}
}

export default withDeviceAuth(handler)
