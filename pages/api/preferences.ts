import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getSettings, updatePreferences } from '@/services/settingsService'

export default withLocalAccess(
	createApiHandler({
		GET: async (_req, res) => {
			const settings = await getSettings()
			res.json({ decafStartHour: settings.decafStartHour })
		},
		PUT: async (req, res) => {
			const settings = await updatePreferences(req.body)
			res.json({ decafStartHour: settings.decafStartHour })
		},
	}),
)
