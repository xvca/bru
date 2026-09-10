import { prisma } from '@/lib/prisma'
import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import {
	ApiError,
	parseId,
	parseOptionalId,
	parseOptionalString,
} from '@/lib/api/validation'

export default withLocalAccess(
	createApiHandler({
		GET: async (req, res) => {
			const beanId = parseId(req.query.beanId, 'bean ID')
			const brewerId = parseOptionalId(req.query.brewerId, 'brewer ID')
			const method = parseOptionalString(req.query.method, 'method')
			const bean = await prisma.bean.findUnique({ where: { id: beanId } })
			if (!bean) throw new ApiError(400, 'Bean not found')

			const lastBrew = await prisma.brew.findFirst({
				where: {
					...(bean.batchId ? { bean: { batchId: bean.batchId } } : { beanId }),
					brewerId,
					method,
				},
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				select: {
					doseWeight: true,
					yieldWeight: true,
					brewTime: true,
					grindSize: true,
					waterTemperature: true,
					grinderId: true,
					brewerId: true,
				},
			})
			if (!lastBrew) {
				return res.status(404).json({ message: 'No previous brews found' })
			}
			res.json(lastBrew)
		},
	}),
)
