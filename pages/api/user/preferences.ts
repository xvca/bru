import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { userPreferencesSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { defaultBarId: true, decafStartHour: true },
		})
		return res.status(200).json({
			defaultBarId: user?.defaultBarId ?? null,
			decafStartHour: user?.decafStartHour ?? 23,
		})
	}

	if (req.method === 'PUT') {
		const result = userPreferencesSchema.safeParse(req.body)
		if (!result.success) return res.status(400).json({ error: 'Invalid data' })

		const { defaultBrewBar, decafStartHour } = result.data

		const defaultBarId =
			defaultBrewBar === 'personal' ? null : Number(defaultBrewBar)

		await prisma.user.update({
			where: { id: userId },
			data: {
				defaultBarId,
				...(decafStartHour !== undefined && { decafStartHour }),
			},
		})

		return res.status(200).json({ success: true })
	}

	return res.status(405).json({ error: '' })
}

export default withAuth(handler)
