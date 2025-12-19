import { createApiHandler } from '@/lib/api/methodRouter'
import {
	getBrewBarMembers,
	addBrewBarMember,
	isBrewBarOwner,
} from '@/services/brewBarService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { inviteSchema } from '@/lib/validators'

const handler = createApiHandler<AuthRequest>({
	GET: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)

		if (isNaN(brewBarId)) {
			res.status(400).json({ error: 'Valid brew bar ID is required' })
			return
		}

		const members = await getBrewBarMembers(brewBarId)
		const transformedMembers = members.map((member) => ({
			...member,
			isCurrentUser: member.userId === userId,
		}))

		res.status(200).json(transformedMembers)
	},
	POST: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)

		const isOwner = await isBrewBarOwner(brewBarId, userId)
		if (!isOwner) {
			res.status(403).json({ error: 'Not authorized to add members' })
			return
		}

		const validData = inviteSchema.parse(req.body)

		try {
			const member = await addBrewBarMember(
				brewBarId,
				validData.username,
				validData.role,
			)
			res.status(201).json(member)
		} catch (error: any) {
			if (error.message === 'User not found') {
				res.status(404).json({ error: 'User not found' })
			} else if (error.message === 'User is already a member') {
				res.status(409).json({ error: 'User is already a member' })
			} else {
				throw error
			}
		}
	},
})

export default withAuth(handler)
