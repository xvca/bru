import { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

const prefSchema = z.object({
	defaultBrewBar: z.string().optional(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id

	if (req.method === 'GET') {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { defaultBarId: true },
		})
		return res.status(200).json({ defaultBarId: user?.defaultBarId || null })
	}

	if (req.method === 'PUT') {
		const result = prefSchema.safeParse(req.body)
		if (!result.success) return res.status(400).json({ error: 'Invalid data' })

		const { defaultBrewBar } = result.data

		const defaultBarId =
			defaultBrewBar === 'personal' ? null : Number(defaultBrewBar)

		await prisma.user.update({
			where: { id: userId },
			data: { defaultBarId },
		})

		return res.status(200).json({ success: true })
	}

	return res.status(405).json({ error: '' })
}

export default withAuth(handler)
