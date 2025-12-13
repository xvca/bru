import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { beanSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const beanId = parseInt(req.query.id as string)

	if (isNaN(beanId)) {
		res.status(400).json({ message: 'Valid bean ID is required' })
		return
	}

	const bean = await prisma.bean.findUnique({
		where: { id: beanId },
	})

	if (!bean) {
		res.status(404).json({ message: 'Bean not found' })
		return
	}

	let canRead = false
	let canWrite = false

	if (bean.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: {
				barId: bean.barId,
				userId: userId,
			},
		})

		if (membership) {
			if (
				bean.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || '')
			) {
				canWrite = true
			}
		}
	} else {
		if (bean.createdBy === userId) {
			canRead = true
			canWrite = true
		}
	}

	if (!canRead) {
		res.status(404).json({ message: 'Bean not found' })
		return
	}

	if (req.method === 'GET') {
		try {
			res.status(200).json(bean)
			return
		} catch (error) {
			console.error('Error fetching bean:', error)
			res.status(500).json({ message: 'Internal server error' })
			return
		}
	}

	if (!canWrite) {
		res.status(403).json({
			message: 'You do not have permission to modify this bean',
		})
		return
	}

	if (req.method === 'PUT') {
		try {
			const validationResult = beanSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					message: 'Invalid bean data',
					errors: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const {
				name,
				roaster,
				origin,
				roastLevel,
				roastDate,
				freezeDate,
				initialWeight,
				remainingWeight,
				notes,
			} = validationResult.data

			const updatedBean = await prisma.bean.update({
				where: { id: beanId },
				data: {
					name,
					roaster,
					origin,
					roastLevel,
					roastDate: new Date(roastDate),
					freezeDate: freezeDate ? new Date(freezeDate) : null,
					initialWeight,
					remainingWeight,
					notes,
				},
			})

			res.status(200).json(updatedBean)
			return
		} catch (error) {
			console.error('Error updating bean:', error)
			res.status(500).json({ message: 'Failed to update bean' })
			return
		}
	}

	if (req.method === 'DELETE') {
		try {
			const brewCount = await prisma.brew.count({
				where: { beanId },
			})

			if (brewCount > 0) {
				res.status(409).json({
					message: 'Cannot delete bean that is used in brews',
					brewCount,
				})
				return
			}

			await prisma.bean.delete({
				where: { id: beanId },
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error deleting bean:', error)
			res.status(500).json({ message: 'Failed to delete bean' })
			return
		}
	}

	res.status(405).json({ message: 'Method not allowed' })
	return
}

export default withAuth(handler)
