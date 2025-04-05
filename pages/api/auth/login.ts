import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const { username, password } = req.body

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

		// Generate token
		const token = jwt.sign(
			{ id: user.id, username: user.username },
			JWT_SECRET,
			{ expiresIn: '7d' },
		)

		res.status(200).json({
			token,
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
