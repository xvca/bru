// bru/pages/api/brew-bars/[id]/equipment/[equipmentId].ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating equipment update data
const equipmentUpdateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)
	const equipmentId = parseInt(req.query.equipmentId as string)

	if (isNaN(brewBarId) || isNaN(equipmentId)) {
		res.status(400).json({ error: 'Valid IDs are required' })
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

	// Check if the equipment belongs to this brew bar
	const brewBarEquipment = await prisma.brewBarEquipment.findFirst({
		where: {
			barId: brewBarId,
			equipmentId,
		},
		include: {
			equipment: true,
		},
	})

	if (!brewBarEquipment || !brewBarEquipment.equipment) {
		res.status(404).json({ error: 'Equipment not found in this brew bar' })
		return
	}

	// Handle GET request - get equipment details
	if (req.method === 'GET') {
		try {
			res.status(200).json(brewBarEquipment.equipment)
			return
		} catch (error) {
			console.error('Error fetching equipment details:', error)
			res.status(500).json({ error: 'Failed to fetch equipment details' })
			return
		}
	}

	// Handle PUT request - update equipment
	if (req.method === 'PUT') {
		try {
			// Validate request body
			const validationResult = equipmentUpdateSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid equipment data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, type, notes } = validationResult.data

			// Only allow updating equipment if the user created it or is the bar owner
			const equipment = brewBarEquipment.equipment

			if (equipment.createdBy !== userId) {
				// Check if the user is the bar owner
				const isBarOwner = await prisma.brewBar.findFirst({
					where: {
						id: brewBarId,
						createdBy: userId,
					},
				})

				if (!isBarOwner) {
					res.status(403).json({
						error: 'You do not have permission to update this equipment',
					})
					return
				}
			}

			// Update the equipment
			const updatedEquipment = await prisma.equipment.update({
				where: { id: equipmentId },
				data: {
					name,
					type,
					notes,
				},
			})

			res.status(200).json(updatedEquipment)
			return
		} catch (error) {
			console.error('Error updating equipment:', error)
			res.status(500).json({ error: 'Failed to update equipment' })
			return
		}
	}

	// Handle DELETE request - remove equipment from brew bar
	if (req.method === 'DELETE') {
		try {
			// First check if the user is the bar owner
			const isBarOwner = await prisma.brewBar.findFirst({
				where: {
					id: brewBarId,
					createdBy: userId,
				},
			})

			// Then check if user is the equipment creator
			const equipment = brewBarEquipment.equipment
			const isEquipmentCreator = equipment.createdBy === userId

			// Allow deletion if user is either bar owner or equipment creator
			if (!isBarOwner && !isEquipmentCreator) {
				res
					.status(403)
					.json({
						error: 'You do not have permission to delete this equipment',
					})
				return
			}

			// Remove the equipment from the brew bar
			await prisma.brewBarEquipment.deleteMany({
				where: {
					barId: brewBarId,
					equipmentId,
				},
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error removing equipment:', error)
			res.status(500).json({ error: 'Failed to remove equipment' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
