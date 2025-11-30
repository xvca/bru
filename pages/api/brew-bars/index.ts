import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewBarSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		try {
			const brewBars = await prisma.brewBar.findMany({
				where: {
					members: {
						some: {
							userId,
						},
					},
				},
				select: {
					id: true,
					name: true,
					location: true,
					createdAt: true,
					createdBy: true,
					members: {
						select: {
							userId: true,
							role: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			})

			const transformedBars = brewBars.map((bar) => ({
				id: bar.id,
				name: bar.name,
				location: bar.location,
				createdAt: bar.createdAt.toISOString(),
				isOwner: bar.createdBy === userId,
				memberCount: bar.members.length,
				role: bar.members.find((m) => m.userId === userId)?.role || 'Member',
			}))

			return res.status(200).json(transformedBars)
		} catch (error) {
			console.error('Error fetching brew bars:', error)
			return res.status(500).json({ error: 'Failed to fetch brew bars' })
		}
	}

	if (req.method === 'POST') {
		try {
			const validationResult = brewBarSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid brew bar data',
					details: validationResult.error.flatten().fieldErrors,
				})
			}

			const { name, location } = validationResult.data

			const brewBar = await prisma.brewBar.create({
				data: {
					name,
					location,
					createdBy: userId,
					members: {
						create: {
							userId,
							role: 'Owner',
						},
					},
				},
			})

			return res.status(201).json(brewBar)
		} catch (error) {
			console.error('Error creating brew bar:', error)
			return res.status(500).json({ error: 'Failed to create brew bar' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
