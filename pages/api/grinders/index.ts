import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'

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

				if (!membership) {
					return res.status(403).json({ error: 'Not a member of this bar' })
				}

				whereClause = { barId: targetBarId }
			} else {
				whereClause = {
					createdBy: userId,
					barId: null,
				}
			}

			const grinders = await prisma.grinder.findMany({
				where: whereClause,
				orderBy: { name: 'asc' },
			})

			res.status(200).json(grinders)
		} catch (error) {
			console.error('Error fetching grinders:', error)
			res.status(500).json({ error: 'Failed to fetch grinders' })
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
