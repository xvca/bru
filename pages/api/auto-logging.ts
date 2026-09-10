import { withLocalAccess } from '@/lib/api/localRoute'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getSettings, updateAutoLoggingBeans } from '@/services/settingsService'

export default withLocalAccess(
	createApiHandler({
		GET: async (_req, res) => {
			const settings = await getSettings()
			res.json({
				defaultRegularBeanId: settings.defaultRegularBeanId,
				defaultDecafBeanId: settings.defaultDecafBeanId,
			})
		},
		PUT: async (req, res) => {
			const settings = await updateAutoLoggingBeans(req.body)
			res.json({
				defaultRegularBeanId: settings.defaultRegularBeanId,
				defaultDecafBeanId: settings.defaultDecafBeanId,
			})
		},
	}),
)
