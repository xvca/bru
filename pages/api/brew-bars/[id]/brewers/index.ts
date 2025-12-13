import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewerSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		res.status(400).json({ error: 'Valid brew bar ID is required' })
		return
	}

	const membership = await prisma.brewBarMember.findFirst({
		where: {
			barId: brewBarId,
			userId,
		},
	})

	if (!membership) {
		res.status(403).json({ error: 'You do not have access to this brew bar' })
		return
	}

	if (req.method === 'GET') {
		try {
			const brewers = await prisma.brewer.findMany({
				where: {
					barId: brewBarId,
				},
				orderBy: {
					name: 'asc',
				},
			})

			res.status(200).json(brewers)
			return
		} catch (error) {
			console.error('Error fetching brewers:', error)
			res.status(500).json({ error: 'Failed to fetch brewers' })
			return
		}
	}

	if (req.method === 'POST') {
		try {
			const validationResult = brewerSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brewer data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, type, notes } = validationResult.data

			const brewer = await prisma.brewer.create({
				data: {
					name,
					type,
					notes,
					createdBy: userId,
					barId: brewBarId,
				},
			})

			res.status(201).json(brewer)
			return
		} catch (error) {
			console.error('Error creating brewer:', error)
			res.status(500).json({ error: 'Failed to create brewer' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
