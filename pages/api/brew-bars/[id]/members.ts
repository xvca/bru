// bru/pages/api/brew-bars/[id]/members.ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		return res.status(400).json({ error: 'Valid brew bar ID is required' })
	}

	// Verify the user is a member of this brew bar
	const membership = await prisma.brewBarMember.findFirst({
		where: {
			barId: brewBarId,
			userId: userId,
		},
	})

	if (!membership) {
		return res
			.status(403)
			.json({ error: 'You do not have access to this brew bar' })
	}

	if (req.method === 'GET') {
		try {
			// Get all members of the brew bar
			const members = await prisma.brewBarMember.findMany({
				where: {
					barId: brewBarId,
				},
				include: {
					user: {
						select: {
							id: true,
							username: true,
						},
					},
				},
			})

			// Transform the data to include isCurrentUser flag
			const transformedMembers = members.map((member) => ({
				id: member.id,
				userId: member.user.id,
				username: member.user.username,
				role: member.role || 'Member',
				isCurrentUser: member.user.id === userId,
			}))

			return res.status(200).json(transformedMembers)
		} catch (error) {
			console.error('Error fetching brew bar members:', error)
			return res.status(500).json({ error: 'Failed to fetch members' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
