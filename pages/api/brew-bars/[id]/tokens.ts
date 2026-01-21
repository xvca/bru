import { NextApiResponse } from 'next'
import { AuthRequest, withAuth } from '@/lib/auth'
import { isBrewBarOwner } from '@/services/brewBarService'
import {
	generateDeviceToken,
	getTokensForBar,
	revokeToken,
} from '@/services/deviceTokenService'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const { id } = req.query
	const barId = parseInt(id as string, 10)
	const userId = req.user!.id

	if (isNaN(barId)) {
		return res.status(400).json({ error: 'Invalid brew bar ID' })
	}

	const isOwner = await isBrewBarOwner(barId, userId)
	if (!isOwner) {
		return res
			.status(403)
			.json({ error: 'Only brew bar owners can manage device tokens' })
	}

	if (req.method === 'GET') {
		const tokens = await getTokensForBar(barId)
		return res.status(200).json(tokens)
	}

	if (req.method === 'POST') {
		const { deviceName } = req.body

		const tokenData = await generateDeviceToken(barId, userId, deviceName)

		return res.status(201).json({
			token: tokenData.token,
			id: tokenData.id,
			createdAt: tokenData.createdAt,
		})
	}

	if (req.method === 'DELETE') {
		const { tokenId } = req.body

		if (!tokenId || isNaN(parseInt(tokenId, 10))) {
			return res.status(400).json({ error: 'Invalid token ID' })
		}

		await revokeToken(parseInt(tokenId, 10))

		return res.status(200).json({ message: 'Token revoked successfully' })
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
