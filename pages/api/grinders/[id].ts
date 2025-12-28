import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import {
	getGrinderById,
	updateGrinder,
	deleteGrinder,
} from '@/services/grinderService'
import { withAuth, type AuthRequest } from '@/lib/auth'
import { grinderSchema } from '@/lib/validators'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const grinderId = parseInt(req.query.id as string)

	if (isNaN(grinderId)) return res.status(400).json({ error: 'Invalid ID' })

	try {
		const grinder = await getGrinderById(grinderId, userId)
		if (!grinder) return res.status(404).json({ error: 'Not found' })
		return res.status(200).json(grinder)
	} catch (error: any) {
		if (error.message === 'Forbidden') {
			return res.status(403).json({ error: 'Forbidden' })
		}
		throw error
	}
}

async function handlePut(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const grinderId = parseInt(req.query.id as string)

	if (isNaN(grinderId)) return res.status(400).json({ error: 'Invalid ID' })

	const result = grinderSchema.safeParse(req.body)
	if (!result.success) return res.status(400).json({ error: 'Invalid data' })

	try {
		const updated = await updateGrinder(grinderId, result.data, userId)
		return res.status(200).json(updated)
	} catch (error: any) {
		if (error.message === 'Not found') {
			return res.status(404).json({ error: 'Not found' })
		}
		if (error.message === 'Forbidden') {
			return res.status(403).json({ error: 'Forbidden' })
		}
		throw error
	}
}

async function handleDelete(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const grinderId = parseInt(req.query.id as string)

	if (isNaN(grinderId)) return res.status(400).json({ error: 'Invalid ID' })

	try {
		await deleteGrinder(grinderId, userId)
		return res.status(204).end()
	} catch (error: any) {
		if (error.message === 'Not found') {
			return res.status(404).json({ error: 'Not found' })
		}
		if (error.message === 'Forbidden') {
			return res.status(403).json({ error: 'Forbidden' })
		}
		throw error
	}
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		PUT: handlePut,
		DELETE: handleDelete,
	}),
)
