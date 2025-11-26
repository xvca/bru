import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating brew data
const brewSchema = z.object({
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

	if (req.method === 'GET') {
		try {
			const brews = await prisma.brew.findMany({
				where: {
					userId: userId,
				},
				include: {
					bean: {
						select: {
							name: true,
							roaster: true,
						},
					},
					method: {
						select: {
							name: true,
						},
					},
				},
				orderBy: {
					brewDate: 'desc',
				},
			})

			res.status(200).json(brews)
		} catch (error) {
			console.error('Error fetching brews:', error)
			res.status(500).json({ error: 'Failed to fetch brews' })
		}
	} else if (req.method === 'POST') {
		try {
			// Validate request body
			const validationResult = brewSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid brew data',
					details: validationResult.error.flatten().fieldErrors,
				})
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

			const brew = await prisma.brew.create({
				data: {
					userId,
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

			res.status(201).json(brew)
		} catch (error) {
			console.error('Error creating brew:', error)
			res.status(500).json({ error: 'Failed to create brew' })
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
