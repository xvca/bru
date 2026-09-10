import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { createBean, getBeans } from '@/services/beanService'

export default withLocalAccess(
	createApiHandler({
		GET: async (_req, res) => res.json(await getBeans()),
		POST: async (req, res) => {
			const bean = await createBean(req.body)
			res.status(201).json(bean)
		},
	}),
)
