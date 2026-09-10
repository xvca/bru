import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { parseId } from '@/lib/api/validation'
import { markBeanAsEmpty } from '@/services/beanService'

export default withLocalAccess(
	createApiHandler({
		POST: async (req, res) =>
			res.json(await markBeanAsEmpty(parseId(req.query.id))),
	}),
)
