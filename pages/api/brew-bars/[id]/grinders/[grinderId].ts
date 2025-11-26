import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating grinder update data
const grinderUpdateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	burrType: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)
	const grinderId = parseInt(req.query.grinderId as string)

	if (isNaN(brewBarId) || isNaN(grinderId)) {
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

	// Check if the grinder belongs to this brew bar
	const brewBarGrinder = await prisma.brewBarEquipment.findFirst({
		where: {
			barId: brewBarId,
			grinderId,
		},
		include: {
			grinder: true,
		},
	})

	if (!brewBarGrinder || !brewBarGrinder.grinder) {
		res.status(404).json({ error: 'Grinder not found in this brew bar' })
		return
	}

	// Handle GET request - get grinder details
	if (req.method === 'GET') {
		try {
			res.status(200).json(brewBarGrinder.grinder)
			return
		} catch (error) {
			console.error('Error fetching grinder details:', error)
			res.status(500).json({ error: 'Failed to fetch grinder details' })
			return
		}
	}

	// Handle PUT request - update grinder
	if (req.method === 'PUT') {
		try {
			// Validate request body
			const validationResult = grinderUpdateSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid grinder data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, burrType, notes } = validationResult.data

			// Only allow updating grinder if the user created it or is the bar owner
			const grinder = brewBarGrinder.grinder

			if (grinder.createdBy !== userId) {
				// Check if the user is the bar owner
				const isBarOwner = await prisma.brewBar.findFirst({
					where: {
						id: brewBarId,
						createdBy: userId,
					},
				})

				if (!isBarOwner) {
					res.status(403).json({
						error: 'You do not have permission to update this grinder',
					})
					return
				}
			}

			// Update the grinder
			const updatedGrinder = await prisma.grinder.update({
				where: { id: grinderId },
				data: {
					name,
					burrType,
					notes,
				},
			})

			res.status(200).json(updatedGrinder)
			return
		} catch (error) {
			console.error('Error updating grinder:', error)
			res.status(500).json({ error: 'Failed to update grinder' })
			return
		}
	}

	// Handle DELETE request - remove grinder from brew bar
	if (req.method === 'DELETE') {
		try {
			// First check if the user is the bar owner
			const isBarOwner = await prisma.brewBar.findFirst({
				where: {
					id: brewBarId,
					createdBy: userId,
				},
			})

			// Then check if user is the grinder creator
			const grinder = brewBarGrinder.grinder
			const isGrinderCreator = grinder.createdBy === userId

			// Allow deletion if user is either bar owner or grinder creator
			if (!isBarOwner && !isGrinderCreator) {
				res
					.status(403)
					.json({ error: 'You do not have permission to delete this grinder' })
				return
			}

			// Remove the grinder from the brew bar
			await prisma.brewBarEquipment.deleteMany({
				where: {
					barId: brewBarId,
					grinderId,
				},
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error removing grinder:', error)
			res.status(500).json({ error: 'Failed to remove grinder' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
