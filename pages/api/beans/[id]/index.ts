import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { parseId, ApiError } from '@/lib/api/validation'
import { getBeanById, updateBean, deleteBean } from '@/services/beanService'

export default withLocalAccess(
	createApiHandler({
		GET: async (req, res) => {
			const bean = await getBeanById(parseId(req.query.id))
			if (!bean) throw new ApiError(404, 'Bean not found')
			return res.json(bean)
		},
		PUT: async (req, res) =>
			res.json(await updateBean(parseId(req.query.id), req.body)),
		DELETE: async (req, res) => {
			await deleteBean(parseId(req.query.id))
			res.status(204).end()
		},
	}),
)
