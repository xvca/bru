import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getBrewById, updateBrew, deleteBrew } from '@/services/brewService'
import { withAuth, type AuthRequest } from '@/lib/auth'
import { brewSchema } from '@/lib/validators'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const brewId = parseInt(req.query.id as string)

	if (isNaN(brewId))
		return res.status(400).json({ error: 'Valid brew ID is required' })

	const brew = await getBrewById(brewId, userId)

	if (!brew) {
		return res.status(404).json({
			error: "Brew not found or you don't have permission to access it",
		})
	}

	return res.status(200).json(brew)
}

async function handlePut(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const brewId = parseInt(req.query.id as string)

	const validationResult = brewSchema.safeParse(req.body)

	if (!validationResult.success) {
		return res.status(400).json({
			error: 'Invalid brew data',
			details: validationResult.error.flatten().fieldErrors,
		})
	}

	try {
		const updatedBrew = await updateBrew(brewId, validationResult.data, userId)
		return res.status(200).json(updatedBrew)
	} catch (error: any) {
		if (
			error.message.includes('not found') ||
			error.message.includes('permission')
		) {
			return res.status(404).json({ error: error.message })
		}
		throw error
	}
}

async function handleDelete(req: AuthRequest, res: NextApiResponse) {
	const { id: userId } = req.user!
	const brewId = parseInt(req.query.id as string)

	try {
		await deleteBrew(brewId, userId)
		return res.status(204).end()
	} catch (error: any) {
		if (
			error.message.includes('not found') ||
			error.message.includes('permission')
		) {
			return res.status(404).json({ error: error.message })
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
