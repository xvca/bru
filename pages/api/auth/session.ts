import { withAuth } from '@/lib/auth'

export default withAuth(async (req, res) => {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET')
		res.status(405).end()
		return
	}
	res.status(200).json({ user: req.user })
})
