import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating brew update data
const brewUpdateSchema = z.object({
	beanId: z.number({ required_error: 'Bean is required' }),
	methodId: z.number({ required_error: 'Brew method is required' }),
	doseWeight: z.number().min(1, 'Dose weight must be at least 1g'),
	yieldWeight: z
		.number()
		.min(1, 'Yield weight must be at least 1g')
		.optional()
		.nullable(),
	brewTime: z
		.number()
		.int()
		.min(1, 'Brew time must be at least 1 second')
		.optional()
		.nullable(),
	grindSize: z.string().optional().nullable(),
	waterTemperature: z
		.number()
		.min(1, 'Temperature must be at least 1°C')
		.optional()
		.nullable(),
	rating: z
		.number()
		.int()
		.min(0)
		.max(5, 'Rating must be between 0 and 5')
		.optional()
		.nullable(),
	tastingNotes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewId = parseInt(req.query.id as string)

	if (isNaN(brewId)) {
		res.status(400).json({ error: 'Valid brew ID is required' })
		return
	}

	// Check if brew exists and belongs to user
	const brew = await prisma.brew.findFirst({
		where: {
			id: brewId,
			userId: userId,
		},
	})

	if (!brew) {
		res.status(404).json({
			error: "Brew not found or you don't have permission to access it",
		})
		return
	}

	// Handle GET request - get a single brew
	if (req.method === 'GET') {
		try {
			const brewWithDetails = await prisma.brew.findUnique({
				where: {
					id: brewId,
				},
				include: {
					bean: true,
					method: true,
				},
			})

			res.status(200).json(brewWithDetails)
		} catch (error) {
			console.error('Error fetching brew:', error)
			res.status(500).json({ error: 'Failed to fetch brew' })
		}
	}

	// Handle PUT request - update a brew
	else if (req.method === 'PUT') {
		try {
			// Validate request body
			const validationResult = brewUpdateSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brew data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const {
				beanId,
				methodId,
				doseWeight,
				yieldWeight,
				brewTime,
				grindSize,
				waterTemperature,
				rating,
				tastingNotes,
			} = validationResult.data

			const updatedBrew = await prisma.brew.update({
				where: { id: brewId },
				data: {
					beanId,
					methodId,
					doseWeight,
					yieldWeight,
					brewTime,
					grindSize,
					waterTemperature,
					rating,
					tastingNotes,
				},
			})

			res.status(200).json(updatedBrew)
		} catch (error) {
			console.error('Error updating brew:', error)
			res.status(500).json({ error: 'Failed to update brew' })
		}
	}

	// Handle DELETE request - delete a brew
	else if (req.method === 'DELETE') {
		try {
			await prisma.brew.delete({
				where: { id: brewId },
			})

			res.status(204).end()
		} catch (error) {
			console.error('Error deleting brew:', error)
			res.status(500).json({ error: 'Failed to delete brew' })
		}
	}

	// If reaching here, method not allowed
	else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
