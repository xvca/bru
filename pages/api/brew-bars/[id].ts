import { createApiHandler } from '@/lib/api/methodRouter'
import {
	getBrewBarById,
	updateBrewBar,
	deleteBrewBar,
} from '@/services/brewBarService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewBarSchema } from '@/lib/validators'

const handler = createApiHandler<AuthRequest>({
	GET: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)

		if (isNaN(brewBarId)) {
			res.status(400).json({ error: 'Valid brew bar ID is required' })
			return
		}

		const brewBar = await getBrewBarById(brewBarId)

		if (
			!brewBar ||
			!brewBar.members.some((member) => member.userId === userId)
		) {
			res.status(404).json({
				error: "Brew bar not found or you don't have access to it",
			})
			return
		}

		const userMembership = brewBar.members.find(
			(member) => member.userId === userId,
		)
		const isOwner = brewBar.createdBy === userId
		const userRole = userMembership?.role || 'Member'

		res.status(200).json({
			id: brewBar.id,
			name: brewBar.name,
			location: brewBar.location,
			createdAt: brewBar.createdAt,
			createdBy: brewBar.createdBy,
			isOwner,
			role: userRole,
		})
	},
	PUT: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)

		const brewBar = await getBrewBarById(brewBarId)
		if (!brewBar || brewBar.createdBy !== userId) {
			res.status(403).json({
				error: 'You do not have permission to update this brew bar',
			})
			return
		}

		const validationResult = brewBarSchema.safeParse(req.body)

		if (!validationResult.success) {
			res.status(400).json({
				error: 'Invalid brew bar data',
				details: validationResult.error.flatten().fieldErrors,
			})
			return
		}

		const updatedBrewBar = await updateBrewBar(brewBarId, validationResult.data)
		res.status(200).json(updatedBrewBar)
	},
	DELETE: async (req, res) => {
		const userId = req.user!.id
		const brewBarId = parseInt(req.query.id as string)

		const brewBar = await getBrewBarById(brewBarId)
		if (!brewBar || brewBar.createdBy !== userId) {
			res.status(403).json({
				error: 'You do not have permission to delete this brew bar',
			})
			return
		}

		await deleteBrewBar(brewBarId)
		res.status(204).end()
	},
})

export default withAuth(handler)
