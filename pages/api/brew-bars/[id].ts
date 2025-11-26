import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating brew bar update data
const brewBarUpdateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	location: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	if (isNaN(brewBarId)) {
		res.status(400).json({ error: 'Valid brew bar ID is required' })
		return
	}

	// Check if brew bar exists and if user is a member
	const brewBar = await prisma.brewBar.findFirst({
		where: {
			id: brewBarId,
			members: {
				some: {
					userId,
				},
			},
		},
		include: {
			members: {
				select: {
					userId: true,
					role: true,
				},
			},
		},
	})

	if (!brewBar) {
		res.status(404).json({
			error: "Brew bar not found or you don't have access to it",
		})
		return
	}

	// Check if user is a member and get their role
	const userMembership = brewBar.members.find(
		(member) => member.userId === userId,
	)
	const isOwner = brewBar.createdBy === userId
	const userRole = userMembership?.role || 'Member'

	// Handle GET request - get a single brew bar
	if (req.method === 'GET') {
		try {
			const transformedBar = {
				id: brewBar.id,
				name: brewBar.name,
				location: brewBar.location,
				createdAt: brewBar.createdAt,
				createdBy: brewBar.createdBy,
				isOwner,
				role: userRole,
			}

			res.status(200).json(transformedBar)
			return
		} catch (error) {
			console.error('Error fetching brew bar details:', error)
			res.status(500).json({ error: 'Failed to fetch brew bar details' })
			return
		}
	}

	// Handle PUT request - update a brew bar (owner only)
	if (req.method === 'PUT') {
		// Only owners can update the brew bar
		if (!isOwner) {
			res.status(403).json({
				error: 'You do not have permission to update this brew bar',
			})
			return
		}

		try {
			// Validate request body
			const validationResult = brewBarUpdateSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid brew bar data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, location } = validationResult.data

			const updatedBrewBar = await prisma.brewBar.update({
				where: { id: brewBarId },
				data: { name, location },
			})

			res.status(200).json(updatedBrewBar)
			return
		} catch (error) {
			console.error('Error updating brew bar:', error)
			res.status(500).json({ error: 'Failed to update brew bar' })
			return
		}
	}

	// Handle DELETE request - delete a brew bar (owner only)
	if (req.method === 'DELETE') {
		// Only owners can delete the brew bar
		if (!isOwner) {
			res.status(403).json({
				error: 'You do not have permission to delete this brew bar',
			})
			return
		}

		try {
			// Delete all members first (to handle foreign key constraints)
			await prisma.brewBarMember.deleteMany({
				where: { barId: brewBarId },
			})

			// Then delete the brew bar
			await prisma.brewBar.delete({
				where: { id: brewBarId },
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error deleting brew bar:', error)
			res.status(500).json({ error: 'Failed to delete brew bar' })
			return
		}
	}

	// If reaching here, method not allowed
	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
