import { createApiHandler } from '@/lib/api/methodRouter'
import { checkUsernameAvailability } from '@/services/userService'
import { NextApiResponse, NextApiRequest } from 'next'

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
	const { username } = req.query
	if (!username || typeof username !== 'string') {
		return res.status(400).json({ error: 'Username required' })
	}
	const available = await checkUsernameAvailability(username)
	return res.status(200).json({ available })
}

export default createApiHandler({
	GET: handleGet,
})
