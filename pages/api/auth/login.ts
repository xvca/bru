import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authRoute } from '@/lib/api/authRoute'
import { createSession, revokeSession } from '@/services/sessionService'
import { SESSION_COOKIE, setSessionCookie } from '@/lib/session'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const { username, password } = req.body ?? {}
		if (
			typeof username !== 'string' ||
			typeof password !== 'string' ||
			!username ||
			!password
		) {
			return res
				.status(400)
				.json({ error: 'Username and password are required' })
		}

		// Find user
		const user = await prisma.user.findUnique({
			where: { username },
		})

		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		// Compare password
		const passwordMatch = await bcrypt.compare(password, user.password)
		if (!passwordMatch) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		const session = await createSession(user.id, user.password)
		if (!session) return res.status(401).json({ error: 'Invalid credentials' })
		await revokeSession(req.cookies[SESSION_COOKIE])
		setSessionCookie(req, res, session.token, session.expiresAt)

		res.status(200).json({
			user: {
				id: user.id,
				username: user.username,
			},
		})
	} catch (error) {
		console.error('Login error:', error)
		res.status(500).json({ error: 'Failed to login' })
	}
}

export default authRoute('POST', handler)
