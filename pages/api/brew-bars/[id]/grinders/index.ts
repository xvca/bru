import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { grinderSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		return res.status(400).json({ error: 'Valid brew bar ID is required' })
	}

	const membership = await prisma.brewBarMember.findFirst({
		where: { barId: brewBarId, userId: userId },
	})

	if (!membership) {
		return res
			.status(403)
			.json({ error: 'You do not have access to this brew bar' })
	}

	if (req.method === 'GET') {
		try {
			const grinders = await prisma.grinder.findMany({
				where: { barId: brewBarId },
				orderBy: { name: 'asc' },
			})
			return res.status(200).json(grinders)
		} catch (error) {
			console.error('Error fetching grinders:', error)
			return res.status(500).json({ error: 'Failed to fetch grinders' })
		}
	}

	if (req.method === 'POST') {
		try {
			const validationResult = grinderSchema.safeParse(req.body)

			if (!validationResult.success) {
				return res.status(400).json({
					error: 'Invalid grinder data',
					details: validationResult.error.flatten().fieldErrors,
				})
			}

			const { name, burrType, notes } = validationResult.data

			const grinder = await prisma.grinder.create({
				data: {
					name,
					burrType,
					notes,
					createdBy: userId,
					barId: brewBarId,
				},
			})

			return res.status(201).json(grinder)
		} catch (error) {
			console.error('Error creating grinder:', error)
			return res.status(500).json({ error: 'Failed to create grinder' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
