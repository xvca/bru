import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { grinderSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)
	const grinderId = parseInt(req.query.grinderId as string)

	if (isNaN(brewBarId) || isNaN(grinderId)) {
		res.status(400).json({ error: 'Valid IDs are required' })
		return
	}

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

	if (req.method === 'PUT') {
		try {
			const validationResult = grinderSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid grinder data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, burrType, notes } = validationResult.data

			const grinder = brewBarGrinder.grinder

			if (grinder.createdBy !== userId) {
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

	if (req.method === 'DELETE') {
		try {
			const isBarOwner = await prisma.brewBar.findFirst({
				where: {
					id: brewBarId,
					createdBy: userId,
				},
			})

			const grinder = brewBarGrinder.grinder
			const isGrinderCreator = grinder.createdBy === userId

			if (!isBarOwner && !isGrinderCreator) {
				res
					.status(403)
					.json({ error: 'You do not have permission to delete this grinder' })
				return
			}

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
