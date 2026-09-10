import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import {
	ApiError,
	parseId,
	parseOptionalId,
	parseOptionalString,
} from '@/lib/api/validation'
import { getBrews, createBrew } from '@/services/brewService'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

export default withLocalAccess(
	createApiHandler({
		GET: async (req, res) => {
			const limit =
				req.query.limit === undefined
					? DEFAULT_PAGE_SIZE
					: parseId(req.query.limit, 'limit')
			if (limit > MAX_PAGE_SIZE) {
				throw new ApiError(400, `Limit must not exceed ${MAX_PAGE_SIZE}`)
			}

			const rows = await getBrews({
				limit,
				cursor: parseOptionalId(req.query.cursor, 'cursor'),
				filters: {
					beanId: parseOptionalId(req.query.beanId, 'bean ID'),
					batchId: parseOptionalString(req.query.batchId, 'batch ID'),
					method: parseOptionalString(req.query.method, 'method'),
				},
			})
			const hasMore = rows.length > limit
			const brews = rows.slice(0, limit)
			res.json({
				brews,
				hasMore,
				nextId: hasMore ? brews.at(-1)!.id : null,
			})
		},
		POST: async (req, res) => {
			const brew = await createBrew(req.body)
			res.status(201).json(brew)
		},
	}),
)
