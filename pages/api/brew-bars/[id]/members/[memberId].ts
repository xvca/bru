// pages/api/brew-bars/[id]/members/[memberId].ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)
	const memberUserId = parseInt(req.query.memberId as string)

	if (isNaN(brewBarId) || isNaN(memberUserId)) {
		return res.status(400).json({ error: 'Valid IDs required' })
	}

	// Only allow DELETE method
	if (req.method !== 'DELETE') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		// Verify the requestor is the bar owner
		const brewBar = await prisma.brewBar.findFirst({
			where: {
				id: brewBarId,
				createdBy: userId,
			},
		})

		if (!brewBar) {
			return res.status(403).json({ error: 'Not authorized to remove members' })
		}

		// Remove the member
		await prisma.brewBarMember.delete({
			where: {
				barId_userId: {
					barId: brewBarId,
					userId: memberUserId,
				},
			},
		})

		res.status(204).end()
		return
	} catch (error) {
		console.error('Error removing member:', error)
		res.status(500).json({ error: 'Failed to remove member' })
		return
	}
}

export default withAuth(handler)
