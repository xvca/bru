import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewerSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		try {
			const { barId } = req.query
			let whereClause: any = {}

			if (barId && barId !== 'undefined' && barId !== 'null') {
				const targetBarId = parseInt(barId as string)

				const membership = await prisma.brewBarMember.findFirst({
					where: { barId: targetBarId, userId },
				})

				if (!membership) return res.status(403).json({ error: 'Not a member' })
				whereClause = { barId: targetBarId }
			} else {
				whereClause = { createdBy: userId, barId: null }
			}

			const brewers = await prisma.brewer.findMany({
				where: whereClause,
				orderBy: { name: 'asc' },
			})

			res.status(200).json(brewers)
		} catch (error) {
			console.error(error)
			res.status(500).json({ error: 'Failed to fetch brewers' })
		}
	} else if (req.method === 'POST') {
		try {
			const result = brewerSchema.safeParse(req.body)

			if (!result.success)
				return res.status(400).json({ error: 'Invalid data' })

			const { name, type, notes, barId } = result.data

			if (barId) {
				const membership = await prisma.brewBarMember.findFirst({
					where: { barId, userId },
				})

				if (!membership) return res.status(403).json({ error: 'Not a member' })
			}

			const brewer = await prisma.brewer.create({
				data: {
					name,
					type,
					notes,
					createdBy: userId,
					barId: barId || null,
				},
			})
			res.status(201).json(brewer)
		} catch (error) {
			console.error(error)
			res.status(500).json({ error: 'Failed to create brewer' })
		}
	} else {
		res.status(405).end()
	}
}

export default withAuth(handler)
