import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getBeansForBar, createBean } from '@/services/beanService'
import { withAuth, type AuthRequest } from '@/lib/auth'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	// barId can be 'null' string or undefined
	const barIdParam = req.query.barId

	let barId: number | null = null
	if (barIdParam && barIdParam !== 'null') {
		barId = Number(barIdParam)
	}

	const beans = await getBeansForBar(barId, userId)
	return res.status(200).json(beans)
}

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const bean = await createBean({ ...req.body, createdBy: userId })
	return res.status(201).json(bean)
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		POST: handlePost,
	}),
)
