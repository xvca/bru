import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewerSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)
	const brewerId = parseInt(req.query.brewerId as string)

	if (isNaN(brewBarId) || isNaN(brewerId)) {
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

	const brewer = await prisma.brewer.findFirst({
		where: {
			id: brewerId,
			barId: brewBarId,
		},
	})

	if (!brewer) {
		res.status(404).json({ error: 'Brewer not found in this brew bar' })
		return
	}

	if (req.method === 'GET') {
		res.status(200).json(brewer)
		return
	}

	if (req.method === 'PUT') {
		try {
			const validationResult = brewerSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brewer data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, type, notes } = validationResult.data

			if (brewer.createdBy !== userId) {
				const isBarOwner = await prisma.brewBar.findFirst({
					where: { id: brewBarId, createdBy: userId },
				})
				if (!isBarOwner) {
					res.status(403).json({
						error: 'You do not have permission to update this brewer',
					})
					return
				}
			}

			const updatedBrewer = await prisma.brewer.update({
				where: { id: brewerId },
				data: { name, type, notes },
			})

			res.status(200).json(updatedBrewer)
			return
		} catch (error) {
			console.error('Error updating brewer:', error)
			res.status(500).json({ error: 'Failed to update brewer' })
			return
		}
	}

	if (req.method === 'DELETE') {
		try {
			const isBarOwner = await prisma.brewBar.findFirst({
				where: { id: brewBarId, createdBy: userId },
			})
			const isCreator = brewer.createdBy === userId

			if (!isBarOwner && !isCreator) {
				res.status(403).json({
					error: 'You do not have permission to delete this brewer',
				})
				return
			}

			await prisma.brewer.delete({
				where: { id: brewerId },
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error deleting brewer:', error)
			res.status(500).json({ error: 'Failed to delete brewer' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
