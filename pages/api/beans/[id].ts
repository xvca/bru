// p// pages/api/beans/[id].ts
import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating bean update data
const beanUpdateSchema = z.object({
	name: z.string().min(1, 'Bean name is required'),
	roaster: z.string().optional().nullable(),
	origin: z.string().optional().nullable(),
	roastLevel: z.string().optional().nullable(),
	roastDate: z.string(), // Date will be parsed in the handler
	freezeDate: z.string().optional().nullable(),
	initialWeight: z.number().positive('Weight must be positive'),
	remainingWeight: z
		.number()
		.positive('Weight must be positive')
		.optional()
		.nullable(),
	notes: z.string().optional().nullable(),
})

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const beanId = parseInt(req.query.id as string)

	if (isNaN(beanId)) {
		res.status(400).json({ message: 'Valid bean ID is required' })
		return
	}

	// Check if bean exists and belongs to user
	const bean = await prisma.bean.findFirst({
		where: {
			id: beanId,
			createdBy: userId,
		},
	})

	if (!bean) {
		res.status(404).json({
			message: "Bean not found or you don't have permission to access it",
		})
		return
	}

	// Handle GET request - get a single bean
	if (req.method === 'GET') {
		try {
			res.status(200).json(bean)
			return
		} catch (error) {
			console.error('Error fetching bean:', error)
			res.status(500).json({ message: 'Internal server error' })
			return
		}
	}

	// Handle PUT request - update a bean
	if (req.method === 'PUT') {
		try {
			// Validate request body
			const validationResult = beanUpdateSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					message: 'Invalid bean data',
					errors: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const {
				name,
				roaster,
				origin,
				roastLevel,
				roastDate,
				freezeDate,
				initialWeight,
				remainingWeight,
				notes,
			} = validationResult.data

			const updatedBean = await prisma.bean.update({
				where: { id: beanId },
				data: {
					name,
					roaster,
					origin,
					roastLevel,
					roastDate: new Date(roastDate),
					freezeDate: freezeDate ? new Date(freezeDate) : null,
					initialWeight,
					remainingWeight,
					notes,
				},
			})

			res.status(200).json(updatedBean)
			return
		} catch (error) {
			console.error('Error updating bean:', error)
			res.status(500).json({ message: 'Failed to update bean' })
			return
		}
	}

	// Handle DELETE request - delete a bean
	if (req.method === 'DELETE') {
		try {
			// Check if bean is used in any brews
			const brewCount = await prisma.brew.count({
				where: { beanId },
			})

			if (brewCount > 0) {
				res.status(409).json({
					message: 'Cannot delete bean that is used in brews',
					brewCount,
				})
				return
			}

			await prisma.bean.delete({
				where: { id: beanId },
			})

			res.status(204).end()
			return
		} catch (error) {
			console.error('Error deleting bean:', error)
			res.status(500).json({ message: 'Failed to delete bean' })
			return
		}
	}

	// If reaching here, method not allowed
	res.status(405).json({ message: 'Method not allowed' })
	return
}

export default withAuth(handler)
