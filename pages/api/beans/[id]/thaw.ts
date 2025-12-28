import { createApiHandler } from '@/lib/api/methodRouter'
import { thawBean, getBeanById } from '@/services/beanService'
import { isBrewBarMember } from '@/services/brewBarService' // Import the new helper
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'
import { NextApiResponse } from 'next'

const thawSchema = z.object({
	weight: z.number().positive(),
	thawDate: z
		.string()
		.or(z.date())
		.transform((val) => new Date(val)),
})

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const beanId = parseInt(req.query.id as string)

	if (isNaN(beanId)) return res.status(400).json({ error: 'Invalid ID' })

	const bean = await getBeanById(beanId)
	if (!bean) return res.status(404).json({ error: 'Not found' })

	if (bean.barId) {
		const isMember = await isBrewBarMember(bean.barId, userId)
		if (!isMember) {
			return res.status(403).json({
				error: 'You must be a member of the brew bar to thaw these beans',
			})
		}
	} else {
		if (bean.createdBy !== userId) {
			return res
				.status(403)
				.json({ error: 'You can only thaw your own personal beans' })
		}
	}

	const result = thawSchema.safeParse(req.body)
	if (!result.success) return res.status(400).json({ error: 'Invalid data' })

	try {
		const thawedBean = await thawBean(
			beanId,
			result.data.weight,
			result.data.thawDate,
		)
		return res.status(200).json(thawedBean)
	} catch (error: any) {
		return res.status(400).json({ error: error.message })
	}
}

export default withAuth(createApiHandler({ POST: handlePost }))
