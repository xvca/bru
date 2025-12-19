import { createApiHandler } from '@/lib/api/methodRouter'
import { removeBrewBarMember, isBrewBarOwner } from '@/services/brewBarService'
import { withAuth, AuthRequest } from '@/lib/auth'

const handler = createApiHandler<AuthRequest>({
	DELETE: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)
		const memberUserId = parseInt(req.query.memberId as string)

		if (isNaN(brewBarId) || isNaN(memberUserId)) {
			res.status(400).json({ error: 'Valid IDs required' })
			return
		}

		const isOwner = await isBrewBarOwner(brewBarId, userId)
		if (!isOwner) {
			res.status(403).json({ error: 'Not authorized to remove members' })
			return
		}

		await removeBrewBarMember(brewBarId, memberUserId)
		res.status(204).end()
	},
})

export default withAuth(handler)
