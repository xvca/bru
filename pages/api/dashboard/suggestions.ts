import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getSuggestionsForBar } from '@/services/suggestionService'
import { withAuth, type AuthRequest } from '@/lib/auth'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const barId = req.query.barId ? Number(req.query.barId) : null
	const userId = req.user!.id

	if (!barId || Number.isNaN(barId)) {
		return res.status(400).json({ error: 'barId query param required' })
	}

	const result = await getSuggestionsForBar(barId, userId)
	return res.status(200).json(result)
}

export default withAuth(
	createApiHandler({
		GET: handleGet,
	}),
)
