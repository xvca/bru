import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { grinderSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const grinderId = parseInt(req.query.id as string)

	if (isNaN(grinderId)) return res.status(400).json({ error: 'Invalid ID' })

	const grinder = await prisma.grinder.findUnique({ where: { id: grinderId } })

	if (!grinder) return res.status(404).json({ error: 'Not found' })

	let canWrite = false
	if (grinder.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: grinder.barId, userId },
		})

		if (
			membership &&
			(grinder.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (grinder.createdBy === userId) canWrite = true
	}

	if (req.method === 'GET') {
		if (!canWrite && grinder.barId) {
			const membership = await prisma.brewBarMember.findFirst({
				where: { barId: grinder.barId, userId },
			})

			if (!membership) return res.status(403).json({ error: 'Forbidden' })
		} else if (!canWrite) {
			return res.status(403).json({ error: 'Forbidden' })
		}
		return res.status(200).json(grinder)
	}

	if (!canWrite) return res.status(403).json({ error: 'Forbidden' })

	if (req.method === 'PUT') {
		const result = grinderSchema.safeParse(req.body)

		if (!result.success) return res.status(400).json({ error: 'Invalid data' })

		const updated = await prisma.grinder.update({
			where: { id: grinderId },
			data: result.data,
		})

		return res.status(200).json(updated)
	}

	if (req.method === 'DELETE') {
		await prisma.grinder.delete({ where: { id: grinderId } })
		return res.status(204).json({})
	}

	return res.status(405).json({})
}

export default withAuth(handler)
