import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getSuggestions } from '@/services/suggestionService'

export default withLocalAccess(
	createApiHandler({
		GET: async (_req, res) => res.json(await getSuggestions()),
	}),
)
