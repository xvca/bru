import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrewers, createBrewer } from '@/services/brewerService'
import { withAuth, type AuthRequest } from '@/lib/auth'
import { brewerSchema } from '@/lib/validators'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const { barId } = req.query

	let targetBarId: number | null = null
	if (barId && barId !== 'undefined' && barId !== 'null') {
		targetBarId = parseInt(barId as string)
	}

	try {
		const brewers = await getBrewers(userId, targetBarId)
		return res.status(200).json(brewers)
	} catch (error: any) {
		if (error.message === 'Not a member of this bar') {
			return res.status(403).json({ error: error.message })
		}
		throw error
	}
}

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const result = brewerSchema.safeParse(req.body)

	if (!result.success) {
		return res.status(400).json({ error: 'Invalid data' })
	}

	try {
		const brewer = await createBrewer(result.data, userId)
		return res.status(201).json(brewer)
	} catch (error: any) {
		if (error.message === 'Not a member of this bar') {
			return res.status(403).json({ error: error.message })
		}
		throw error
	}
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		POST: handlePost,
	}),
)
