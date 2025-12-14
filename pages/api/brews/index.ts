import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

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
					userId: userId,
					barId: null,
				}
			}

			const brews = await prisma.brew.findMany({
				where: whereClause,
				include: {
					bean: { select: { name: true, roaster: true } },
					user: { select: { id: true, username: true } },
					brewBar: { select: { id: true, name: true } },
				},
				orderBy: {
					brewDate: 'desc',
				},
			})

			res.status(200).json(brews)
		} catch (error) {
			console.error('Error fetching brews:', error)
			res.status(500).json({ error: 'Failed to fetch brews' })
		}
	} else if (req.method === 'POST') {
		try {
			const validationResult = brewSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid brew data',
					details: validationResult.error.flatten().fieldErrors,
				})
			}

			const {
				beanId,
				method,
				doseWeight,
				yieldWeight,
				brewTime,
				grindSize,
				waterTemperature,
				rating,
				tastingNotes,
				brewDate,
				barId,
				brewerId,
				grinderId,
			} = validationResult.data

			const result = await prisma.$transaction(async (tx) => {
				const brew = await tx.brew.create({
					data: {
						userId,
						beanId,
						method,
						doseWeight,
						yieldWeight,
						brewTime,
						grindSize,
						waterTemperature,
						rating,
						tastingNotes,
						brewDate: brewDate ? new Date(brewDate) : undefined,
						barId,
						brewerId,
						grinderId,
					},
				})

				const bean = await tx.bean.findUnique({ where: { id: beanId } })
				if (bean && bean.remainingWeight !== null) {
					const newWeight = Math.max(0, bean.remainingWeight - doseWeight)
					await tx.bean.update({
						where: { id: beanId },
						data: { remainingWeight: newWeight },
					})
				}

				return brew
			})

			res.status(201).json(result)
		} catch (error) {
			console.error('Error creating brew:', error)
			res.status(500).json({ error: 'Failed to create brew' })
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
