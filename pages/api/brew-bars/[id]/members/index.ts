// pages/api/brew-bars/[id]/members/index.ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

const inviteSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	role: z.string().optional(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		return res.status(400).json({ error: 'Valid brew bar ID is required' })
	}

	// GET - List members
	if (req.method === 'GET') {
		try {
			const members = await prisma.brewBarMember.findMany({
				where: { barId: brewBarId },
				include: {
					user: {
						select: {
							id: true,
							username: true,
						},
					},
				},
			})

			const transformedMembers = members.map((member) => ({
				...member,
				isCurrentUser: member.userId === userId,
			}))

			return res.status(200).json(transformedMembers)
		} catch (error) {
			console.error('Error fetching members:', error)
			return res.status(500).json({ error: 'Failed to fetch members' })
		}
	}

	// POST - Add new member
	if (req.method === 'POST') {
		try {
			// Verify the requestor is the bar owner
			const brewBar = await prisma.brewBar.findFirst({
				where: {
					id: brewBarId,
					createdBy: userId,
				},
			})

			if (!brewBar) {
				return res.status(403).json({ error: 'Not authorized to add members' })
			}

			// Validate request data
			const validData = inviteSchema.parse(req.body)

			// Find user by username
			const userToInvite = await prisma.user.findUnique({
				where: { username: validData.username },
			})

			if (!userToInvite) {
				return res.status(404).json({ error: 'User not found' })
			}

			// Check if user is already a member
			const existingMember = await prisma.brewBarMember.findUnique({
				where: {
					barId_userId: {
						barId: brewBarId,
						userId: userToInvite.id,
					},
				},
			})

			if (existingMember) {
				return res.status(409).json({ error: 'User is already a member' })
			}

			// Add member
			const member = await prisma.brewBarMember.create({
				data: {
					barId: brewBarId,
					userId: userToInvite.id,
					role: validData.role || 'Member',
				},
			})

			return res.status(201).json(member)
		} catch (error) {
			console.error('Error adding member:', error)
			return res.status(500).json({ error: 'Failed to add member' })
		}
	}

	return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
