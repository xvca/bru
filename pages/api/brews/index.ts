import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrews, createBrew } from '@/services/brewService'
import { withAuth, type AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const { barId, cursor, limit, beanId, batchId, method } = req.query

	let targetBarId: number | null = null
	if (barId && barId !== 'undefined' && barId !== 'null') {
		targetBarId = parseInt(barId as string)
	}

	const options = {
		cursor: cursor ? parseInt(cursor as string) : undefined,
		limit: limit ? parseInt(limit as string) : undefined,
		filters: {
			beanId: beanId ? parseInt(beanId as string) : undefined,
			batchId: batchId as string | undefined,
			method: method as string | undefined,
		},
	}

	try {
		const brews = await getBrews(userId, targetBarId, options)
		const hasMore = brews.length === (options.limit ?? 25)
		const nextId =
			hasMore && brews.length > 0 ? brews[brews.length - 1].id : null

		return res.status(200).json({
			brews,
			nextId,
			hasMore,
		})
	} catch (error: any) {
		if (error.message === 'Not a member of this bar') {
			return res.status(403).json({ error: error.message })
		}
		throw error
	}
}

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const validationResult = brewSchema.safeParse(req.body)

	if (!validationResult.success) {
		return res.status(400).json({
			error: 'Invalid brew data',
			details: validationResult.error.flatten().fieldErrors,
		})
	}

	const brew = await createBrew(validationResult.data, userId)
	return res.status(201).json(brew)
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		POST: handlePost,
	}),
)
