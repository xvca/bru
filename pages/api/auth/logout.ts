import { authRoute } from '@/lib/api/authRoute'
import { SESSION_COOKIE, clearSessionCookie } from '@/lib/session'
import { revokeSession } from '@/services/sessionService'

export default authRoute('POST', async (req, res) => {
	await revokeSession(req.cookies[SESSION_COOKIE])
	clearSessionCookie(req, res)
	return res.status(204).end()
})
