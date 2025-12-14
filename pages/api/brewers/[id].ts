import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewerSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewerId = parseInt(req.query.id as string)

	if (isNaN(brewerId)) return res.status(400).json({ error: 'Invalid ID' })

	const brewer = await prisma.brewer.findUnique({ where: { id: brewerId } })

	if (!brewer) return res.status(404).json({ error: 'Not found' })

	let canWrite = false

	if (brewer.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: brewer.barId, userId },
		})

		if (
			membership &&
			(brewer.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (brewer.createdBy === userId) canWrite = true
	}

	if (req.method === 'GET') {
		if (!canWrite && brewer.barId) {
			const membership = await prisma.brewBarMember.findFirst({
				where: { barId: brewer.barId, userId },
			})

			if (!membership) return res.status(403).json({ error: 'Forbidden' })
		} else if (!canWrite) {
			return res.status(403).json({ error: 'Forbidden' })
		}
		return res.status(200).json(brewer)
	}

	if (!canWrite) return res.status(403).json({ error: 'Forbidden' })

	if (req.method === 'PUT') {
		const result = brewerSchema.safeParse(req.body)
		if (!result.success) return res.status(400).json({ error: 'Invalid data' })

		const updated = await prisma.brewer.update({
			where: { id: brewerId },
			data: result.data,
		})

		return res.status(200).json(updated)
	}

	if (req.method === 'DELETE') {
		await prisma.brewer.delete({ where: { id: brewerId } })

		return res.status(204).json({})
	}

	return res.status(405).json({})
}

export default withAuth(handler)
