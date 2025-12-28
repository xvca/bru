import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { createApiHandler } from '@/lib/api/methodRouter'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	const beanId = parseInt(req.query.beanId as string)
	const brewerId = parseInt(req.query.brewerId as string)

	if (isNaN(beanId) || isNaN(brewerId)) {
		return res
			.status(400)
			.json({ error: 'Valid bean and method IDs are required' })
	}

	try {
		const lastBrew = await prisma.brew.findFirst({
			where: {
				userId,
				beanId,
				brewerId,
			},
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				doseWeight: true,
				yieldWeight: true,
				brewTime: true,
				grindSize: true,
				waterTemperature: true,
				grinderId: true,
				brewerId: true,
			},
		})

		if (lastBrew) {
			return res.status(200).json(lastBrew)
		} else {
			// No previous brews found for this combination
			return res
				.status(404)
				.json({ message: 'No previous brews found for this bean and method' })
		}
	} catch (error) {
		console.error('Error fetching last brew parameters:', error)
		return res.status(500).json({ error: 'Failed to fetch brew parameters' })
	}
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
	}),
)
