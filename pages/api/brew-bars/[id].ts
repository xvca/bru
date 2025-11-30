import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewBarSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		res.status(400).json({ error: 'Valid brew bar ID is required' })
		return
	}

	const brewBar = await prisma.brewBar.findFirst({
		where: {
			id: brewBarId,
			members: {
				some: {
					userId,
				},
			},
		},
		include: {
			members: {
				select: {
					userId: true,
					role: true,
				},
			},
		},
	})

	if (!brewBar) {
		res.status(404).json({
			error: "Brew bar not found or you don't have access to it",
		})
		return
	}

	const userMembership = brewBar.members.find(
		(member) => member.userId === userId,
	)
	const isOwner = brewBar.createdBy === userId
	const userRole = userMembership?.role || 'Member'

	if (req.method === 'GET') {
		try {
			const transformedBar = {
				id: brewBar.id,
				name: brewBar.name,
				location: brewBar.location,
				createdAt: brewBar.createdAt,
				createdBy: brewBar.createdBy,
				isOwner,
				role: userRole,
			}

			res.status(200).json(transformedBar)
			return
		} catch (error) {
			console.error('Error fetching brew bar details:', error)
			res.status(500).json({ error: 'Failed to fetch brew bar details' })
			return
		}
	}

	if (req.method === 'PUT') {
		if (!isOwner) {
			res.status(403).json({
				error: 'You do not have permission to update this brew bar',
			})
			return
		}

		try {
			const validationResult = brewBarSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brew bar data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, location } = validationResult.data

			const updatedBrewBar = await prisma.brewBar.update({
				where: { id: brewBarId },
				data: { name, location },
			})

			res.status(200).json(updatedBrewBar)
			return
		} catch (error) {
			console.error('Error updating brew bar:', error)
			res.status(500).json({ error: 'Failed to update brew bar' })
			return
		}
	}

	if (req.method === 'DELETE') {
		if (!isOwner) {
			res.status(403).json({
				error: 'You do not have permission to delete this brew bar',
			})
			return
		}

		try {
			await prisma.brewBarMember.deleteMany({
				where: { barId: brewBarId },
			})

			await prisma.brewBar.delete({
				where: { id: brewBarId },
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error deleting brew bar:', error)
			res.status(500).json({ error: 'Failed to delete brew bar' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
