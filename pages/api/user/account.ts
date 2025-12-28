import { createApiHandler } from '@/lib/api/methodRouter'
import { updateUserAccount } from '@/services/userService'
import { withAuth, AuthRequest } from '@/lib/auth'
import { NextApiResponse } from 'next'
import { z } from 'zod'

const updateAccountSchema = z.object({
	username: z.string().min(3).optional(),
	currentPassword: z.string().min(1),
	newPassword: z.string().min(6).optional().or(z.literal('')),
})

async function handlePut(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const result = updateAccountSchema.safeParse(req.body)

	if (!result.success) {
		return res.status(400).json({
			error: 'Invalid data',
			details: result.error.flatten().fieldErrors,
		})
	}

	try {
		const data = {
			...result.data,
			newPassword: result.data.newPassword || undefined,
		}

		const user = await updateUserAccount(userId, data)
		return res.status(200).json({ user })
	} catch (error: any) {
		if (error.message === 'Invalid current password') {
			return res.status(401).json({ error: 'Invalid current password' })
		}
		if (error.message === 'Username already taken') {
			return res.status(409).json({ error: 'Username already taken' })
		}
		if (error.message === 'Current password is required') {
			return res.status(400).json({ error: 'Current password is required' })
		}
		throw error
	}
}

export default withAuth(
	createApiHandler<AuthRequest>({
		PUT: handlePut,
	}),
)
