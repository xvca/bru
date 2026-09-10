import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { parseId } from '@/lib/api/validation'
import { thawBean } from '@/services/beanService'
import { z } from 'zod'

export default withLocalAccess(
	createApiHandler({
		POST: async (req, res) => {
			const input = z
				.object({
					weight: z.number().finite().positive(),
					thawDate: z.coerce.date(),
				})
				.parse(req.body)
			return res.json(
				await thawBean(parseId(req.query.id), input.weight, input.thawDate),
			)
		},
	}),
)
