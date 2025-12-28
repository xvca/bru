import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrews, createBrew } from '@/services/brewService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

const handler = createApiHandler<AuthRequest>({
	GET: async (req, res) => {
		const userId = req.user!.id
		const { barId } = req.query

		let targetBarId: number | null = null
		if (barId && barId !== 'undefined' && barId !== 'null') {
			targetBarId = parseInt(barId as string)
		}

		try {
			const brews = await getBrews(userId, targetBarId)
			res.status(200).json(brews)
		} catch (error: any) {
			if (error.message === 'Not a member of this bar') {
				res.status(403).json({ error: error.message })
			} else {
				throw error
			}
		}
	},
	POST: async (req, res) => {
		const userId = req.user!.id
		const validationResult = brewSchema.safeParse(req.body)

		if (!validationResult.success) {
			res.status(400).json({
				error: 'Invalid brew data',
				details: validationResult.error.flatten().fieldErrors,
			})
			return
		}

		const brew = await createBrew(validationResult.data, userId)
		res.status(201).json(brew)
	},
})

export default withAuth(handler)
