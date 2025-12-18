import { NextApiResponse } from 'next'
import { withAuth, AuthRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function handler(req: AuthRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Method not allowed' })
	}

	const { barId } = req.query
	const userId = req.user!.id

	if (!barId) {
		return res.status(400).json({ message: 'Missing barId' })
	}

	try {
		const [beans, user] = await Promise.all([
			prisma.bean.findMany({
				where: {
					barId: Number(barId),
					OR: [{ remainingWeight: { gt: 0 } }, { remainingWeight: null }],
					brews: {
						some: {
							method: 'Espresso',
							barId: Number(barId),
						},
					},
				},
				include: {
					brews: {
						where: { method: 'Espresso' },
						orderBy: { createdAt: 'desc' },
						take: 1,
					},
				},
			}),
			prisma.user.findUnique({
				where: { id: userId },
				select: { decafStartHour: true },
			}),
		])

		const suggestions = beans
			.filter((bean) => bean.brews.length > 0)
			.map(({ brews, ...bean }) => ({
				...bean,
				lastBrew: brews[0],
			}))

		console.log(suggestions)

		return res.status(200).json({
			suggestions,
			decafStartHour: user?.decafStartHour ?? -1,
		})
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: 'Internal server error' })
	}
}

export default withAuth(handler)
