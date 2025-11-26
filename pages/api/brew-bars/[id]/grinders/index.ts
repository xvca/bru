import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating grinder data
const grinderSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	burrType: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		return res.status(400).json({ error: 'Valid brew bar ID is required' })
	}

	// Verify the user is a member of this brew bar
	const membership = await prisma.brewBarMember.findFirst({
		where: {
			barId: brewBarId,
			userId: userId,
		},
	})

	if (!membership) {
		return res
			.status(403)
			.json({ error: 'You do not have access to this brew bar' })
	}

	// Handle GET request - list all grinders for the brew bar
	if (req.method === 'GET') {
		try {
			const grinderItems = await prisma.brewBarEquipment.findMany({
				where: {
					barId: brewBarId,
					grinderId: {
						not: null,
					},
				},
				include: {
					grinder: true,
				},
			})

			const grinders = grinderItems.map((item) => item.grinder).filter(Boolean)

			return res.status(200).json(grinders)
		} catch (error) {
			console.error('Error fetching grinders:', error)
			return res.status(500).json({ error: 'Failed to fetch grinders' })
		}
	}

	// Handle POST request - add new grinder to the brew bar
	if (req.method === 'POST') {
		try {
			// Validate request body
			const validationResult = grinderSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid grinder data',
					details: validationResult.error.flatten().fieldErrors,
				})
			}

			const { name, burrType, notes } = validationResult.data

			// First create the grinder
			const grinder = await prisma.grinder.create({
				data: {
					name,
					burrType,
					notes,
					createdBy: userId,
				},
			})

			// Then associate it with the brew bar
			await prisma.brewBarEquipment.create({
				data: {
					barId: brewBarId,
					grinderId: grinder.id,
				},
			})

			return res.status(201).json(grinder)
		} catch (error) {
			console.error('Error creating grinder:', error)
			return res.status(500).json({ error: 'Failed to create grinder' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
