// bru/pages/api/brew-bars/[id]/equipment/index.ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating equipment data
const equipmentSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	console.log('THIS ROUTE IS RUNNING!!!')

	if (isNaN(brewBarId)) {
		res.status(400).json({ error: 'Valid brew bar ID is required' })
		return
	}

	// Check if user is a member of this brew bar
	const membership = await prisma.brewBarMember.findFirst({
		where: {
			barId: brewBarId,
			userId,
		},
	})

	if (!membership) {
		res.status(403).json({ error: 'You do not have access to this brew bar' })
		return
	}

	// Handle GET request - list all equipment in the brew bar
	if (req.method === 'GET') {
		try {
			const equipment = await prisma.brewBarEquipment.findMany({
				where: {
					barId: brewBarId,
					equipmentId: { not: null },
				},
				include: {
					equipment: true,
				},
			})

			const equipmentList = equipment
				.map((item) => item.equipment)
				.filter(Boolean)

			res.status(200).json(equipmentList)
			return
		} catch (error) {
			console.error('Error fetching equipment:', error)
			res.status(500).json({ error: 'Failed to fetch equipment' })
			return
		}
	}

	// Handle POST request - add new equipment to the brew bar
	if (req.method === 'POST') {
		try {
			// Validate request body
			const validationResult = equipmentSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid equipment data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, type, notes } = validationResult.data

			// Create the equipment
			const equipment = await prisma.equipment.create({
				data: {
					name,
					type,
					notes,
					createdBy: userId, // Associate with the current user
				},
			})

			// Link the equipment to the brew bar
			await prisma.brewBarEquipment.create({
				data: {
					barId: brewBarId,
					equipmentId: equipment.id,
				},
			})

			res.status(201).json(equipment)
			return
		} catch (error) {
			console.error('Error creating equipment:', error)
			res.status(500).json({ error: 'Failed to create equipment' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
