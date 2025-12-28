import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { userPreferencesSchema } from '@/lib/validators'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getUserById, updateUserPrefs } from '@/services/userService'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	const user = await getUserById(userId)

	return res.status(200).json({
		defaultBarId: user?.defaultBarId ?? null,
		decafStartHour: user?.decafStartHour ?? -1,
	})
}

async function handlePut(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	const result = userPreferencesSchema.safeParse(req.body)
	if (!result.success) return res.status(400).json({ error: 'Invalid data' })

	await updateUserPrefs(userId, result.data)

	return res.status(200).json({ success: true })
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		PUT: handlePut,
	}),
)
