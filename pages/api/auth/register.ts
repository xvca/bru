import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	try {
		const { username, password } = req.body

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { username },
		})

		if (existingUser) {
			return res.status(400).json({ error: 'Username already taken' })
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10)

		// Create user
		const user = await prisma.user.create({
			data: {
				username,
				password: hashedPassword,
			},
			select: {
				id: true,
				username: true,
				createdAt: true,
			},
		})

		res.status(201).json(user)
	} catch (error) {
		console.error('Registration error:', error)
		res.status(500).json({ error: 'Failed to register user' })
	}
}
