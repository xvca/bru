import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewId = parseInt(req.query.id as string)

	if (isNaN(brewId)) {
		res.status(400).json({ error: 'Valid brew ID is required' })
		return
	}

	const existingBrew = await prisma.brew.findFirst({
		where: {
			id: brewId,
			userId: userId,
		},
	})

	if (!existingBrew) {
		res.status(404).json({
			error: "Brew not found or you don't have permission to access it",
		})
		return
	}

	if (req.method === 'GET') {
		try {
			const brewWithDetails = await prisma.brew.findUnique({
				where: { id: brewId },
				include: {
					bean: true,
					brewer: true,
					grinder: true,
					brewBar: true,
				},
			})

			res.status(200).json(brewWithDetails)
		} catch (error) {
			console.error('Error fetching brew:', error)
			res.status(500).json({ error: 'Failed to fetch brew' })
		}
	}

	// Handle PUT request
	else if (req.method === 'PUT') {
		try {
			const validationResult = brewSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brew data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
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
				barId,
				brewerId,
				grinderId,
			} = validationResult.data

			const updatedBrew = await prisma.$transaction(async (tx) => {
				if (existingBrew.beanId === beanId) {
					const weightDiff = doseWeight - existingBrew.doseWeight

					if (weightDiff !== 0) {
						const bean = await tx.bean.findUnique({ where: { id: beanId } })
						if (bean && bean.remainingWeight !== null) {
							const newWeight = Math.max(0, bean.remainingWeight - weightDiff)
							await tx.bean.update({
								where: { id: beanId },
								data: { remainingWeight: newWeight },
							})
						}
					}
				} else {
					const oldBean = await tx.bean.findUnique({
						where: { id: existingBrew.beanId },
					})
					if (oldBean && oldBean.remainingWeight !== null) {
						await tx.bean.update({
							where: { id: existingBrew.beanId },
							data: {
								remainingWeight:
									oldBean.remainingWeight + existingBrew.doseWeight,
							},
						})
					}

					const newBean = await tx.bean.findUnique({ where: { id: beanId } })
					if (newBean && newBean.remainingWeight !== null) {
						await tx.bean.update({
							where: { id: beanId },
							data: {
								remainingWeight: Math.max(
									0,
									newBean.remainingWeight - doseWeight,
								),
							},
						})
					}
				}

				return await tx.brew.update({
					where: { id: brewId },
					data: {
						beanId,
						method,
						doseWeight,
						yieldWeight,
						brewTime,
						grindSize,
						waterTemperature,
						rating,
						tastingNotes,
						barId,
						brewerId,
						grinderId,
					},
				})
			})

			res.status(200).json(updatedBrew)
		} catch (error) {
			console.error('Error updating brew:', error)
			res.status(500).json({ error: 'Failed to update brew' })
		}
	} else if (req.method === 'DELETE') {
		try {
			await prisma.brew.delete({
				where: { id: brewId },
			})

			res.status(204).end()
		} catch (error) {
			console.error('Error deleting brew:', error)
			res.status(500).json({ error: 'Failed to delete brew' })
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}

export default withAuth(handler)
