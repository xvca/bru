import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { parseId, ApiError } from '@/lib/api/validation'
import { getBrewById, updateBrew, deleteBrew } from '@/services/brewService'

export default withLocalAccess(
	createApiHandler({
		GET: async (req, res) => {
			const brew = await getBrewById(parseId(req.query.id))
			if (!brew) throw new ApiError(404, 'Brew not found')
			return res.json(brew)
		},
		PUT: async (req, res) =>
			res.json(await updateBrew(parseId(req.query.id), req.body)),
		DELETE: async (req, res) => {
			await deleteBrew(parseId(req.query.id))
			res.status(204).end()
		},
	}),
)
