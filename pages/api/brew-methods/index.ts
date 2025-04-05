import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'

async function handler(req: AuthRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		try {
			// Check if there are any methods
			const count = await prisma.brewMethod.count()

			// If no methods exist, create default ones
			if (count === 0) {
				await prisma.brewMethod.createMany({
					data: [
						{ name: 'Espresso' },
						{ name: 'Pour Over' },
						{ name: 'French Press' },
						{ name: 'AeroPress' },
						{ name: 'Cold Brew' },
						{ name: 'Moka Pot' },
					],
				})
			}

			const brewMethods = await prisma.brewMethod.findMany({
				orderBy: { name: 'asc' },
			})

			return res.status(200).json(brewMethods)
		} catch (error) {
			console.error('Error fetching brew methods:', error)
			return res.status(500).json({ error: 'Failed to fetch brew methods' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
