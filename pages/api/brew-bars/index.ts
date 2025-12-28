import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrewBarsForUser, createBrewBar } from '@/services/brewBarService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { brewBarSchema } from '@/lib/validators'
import { NextApiResponse } from 'next'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBars = await getBrewBarsForUser(userId)

	const transformedBars = brewBars.map((bar) => ({
		id: bar.id,
		name: bar.name,
		location: bar.location,
		createdAt: bar.createdAt.toISOString(),
		isOwner: bar.createdBy === userId,
		memberCount: bar.members.length,
		role: bar.members.find((m) => m.userId === userId)?.role || 'Member',
	}))

	res.status(200).json(transformedBars)
}

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const validationResult = brewBarSchema.safeParse(req.body)

	if (!validationResult.success) {
		res.status(400).json({
			error: 'Invalid brew bar data',
			details: validationResult.error.flatten().fieldErrors,
		})
		return
	}

	const brewBar = await createBrewBar(validationResult.data, userId)
	res.status(201).json(brewBar)
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		POST: handlePost,
	}),
)
