import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { beanSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		try {
			const { barId } = req.query

			console.log({ barId })

			if (barId && barId !== 'undefined' && barId !== 'null') {
				const targetBarId = parseInt(barId as string)

				const membership = await prisma.brewBarMember.findFirst({
					where: {
						barId: targetBarId,
						userId: userId,
					},
				})

				if (!membership) {
					return res.status(403).json({ error: 'Not a member of this bar' })
				}

				const beans = await prisma.bean.findMany({
					where: {
						barId: targetBarId,
					},
					orderBy: {
						createdAt: 'desc',
					},
					include: {
						user: { select: { username: true } },
					},
				})

				return res.status(200).json(beans)
			}

			const beans = await prisma.bean.findMany({
				where: {
					createdBy: userId,
					barId: null,
				},
				orderBy: {
					createdAt: 'desc',
				},
			})
			return res.status(200).json(beans)
		} catch (error) {
			console.error('Error fetching beans:', error)
			return res.status(500).json({ error: 'Failed to fetch beans' })
		}
	} else if (req.method === 'POST') {
		try {
			const validationResult = beanSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid bean data',
					details: validationResult.error.flatten().fieldErrors,
				})
			}

			const {
				name,
				roaster,
				origin,
				roastLevel,
				roastDate,
				freezeDate,
				initialWeight,
				notes,
				barId,
			} = validationResult.data

			if (barId) {
				const membership = await prisma.brewBarMember.findFirst({
					where: { barId, userId },
				})
				if (!membership) {
					return res.status(403).json({ error: 'Not a member of this bar' })
				}
			}

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
					barId: barId || null,
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
