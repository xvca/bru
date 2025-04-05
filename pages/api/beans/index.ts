import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		try {
			const beans = await prisma.bean.findMany({
				where: {
					createdBy: userId,
				},
				orderBy: {
					createdAt: 'desc',
				},
			})
			res.status(200).json(beans)
		} catch (error) {
			console.error('Error fetching beans:', error)
			res.status(500).json({ error: 'Failed to fetch beans' })
		}
	} else if (req.method === 'POST') {
		try {
			const {
				name,
				roaster,
				origin,
				roastLevel,
				roastDate,
				freezeDate,
				initialWeight,
				notes,
			} = req.body

			const bean = await prisma.bean.create({
				data: {
					name,
					roaster,
					origin,
					roastLevel,
					roastDate: new Date(roastDate),
					freezeDate: freezeDate ? new Date(freezeDate) : null,
					initialWeight,
					remainingWeight: initialWeight,
					notes,
					createdBy: userId,
				},
			})

			res.status(201).json(bean)
		} catch (error) {
			console.error('Error creating bean:', error)
			res.status(500).json({ error: 'Failed to create bean' })
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
