import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getGrinders, createGrinder } from '@/services/grinderService'
import { withAuth, type AuthRequest } from '@/lib/auth'
import { grinderSchema } from '@/lib/validators'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const { barId } = req.query

	let targetBarId: number | null = null
	if (barId && barId !== 'undefined' && barId !== 'null') {
		targetBarId = parseInt(barId as string)
	}

	try {
		const grinders = await getGrinders(userId, targetBarId)
		return res.status(200).json(grinders)
	} catch (error: any) {
		if (error.message === 'Not a member of this bar') {
			return res.status(403).json({ error: error.message })
		}
		throw error
	}
}

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const result = grinderSchema.safeParse(req.body)

	if (!result.success) {
		return res.status(400).json({ error: 'Invalid data' })
	}

	try {
		const grinder = await createGrinder(result.data, userId)
		return res.status(201).json(grinder)
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
