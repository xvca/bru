import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrewById, updateBrew, deleteBrew } from '@/services/brewService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

const handler = createApiHandler<AuthRequest>({
	GET: async (req, res) => {
		const userId = req.user!.id
		const brewId = parseInt(req.query.id as string)

		if (isNaN(brewId)) {
			res.status(400).json({ error: 'Valid brew ID is required' })
			return
		}

		const brew = await getBrewById(brewId, userId)

		if (!brew) {
			res.status(404).json({
				error: "Brew not found or you don't have permission to access it",
			})
			return
		}

		res.status(200).json(brew)
	},
	PUT: async (req, res) => {
		const userId = req.user!.id
		const brewId = parseInt(req.query.id as string)

		const validationResult = brewSchema.safeParse(req.body)

		if (!validationResult.success) {
			res.status(400).json({
				error: 'Invalid brew data',
				details: validationResult.error.flatten().fieldErrors,
			})
			return
		}

		try {
			const updatedBrew = await updateBrew(
				brewId,
				validationResult.data,
				userId,
			)
			res.status(200).json(updatedBrew)
		} catch (error: any) {
			if (
				error.message.includes('not found') ||
				error.message.includes('permission')
			) {
				res.status(404).json({ error: error.message })
			} else {
				throw error
			}
		}
	},
	DELETE: async (req, res) => {
		const userId = req.user!.id
		const brewId = parseInt(req.query.id as string)

		try {
			await deleteBrew(brewId, userId)
			res.status(204).end()
		} catch (error: any) {
			if (
				error.message.includes('not found') ||
				error.message.includes('permission')
			) {
				res.status(404).json({ error: error.message })
			} else {
				throw error
			}
		}
	},
})

export default withAuth(handler)
