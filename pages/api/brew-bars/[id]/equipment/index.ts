import type { NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthRequest } from '@/lib/auth'
import { equipmentSchema } from '@/lib/validators'

async function handler(req: AuthRequest, res: NextApiResponse) {
	const userId = req.user!.id
	const brewBarId = parseInt(req.query.id as string)

	console.log('THIS ROUTE IS RUNNING!!!')

	if (isNaN(brewBarId)) {
		res.status(400).json({ error: 'Valid brew bar ID is required' })
		return
	}

	const membership = await prisma.brewBarMember.findFirst({
		where: {
			barId: brewBarId,
			userId,
		},
	})

	if (!membership) {
		res.status(403).json({ error: 'You do not have access to this brew bar' })
		return
	}

	if (req.method === 'GET') {
		try {
			const equipment = await prisma.brewBarEquipment.findMany({
				where: {
					barId: brewBarId,
					equipmentId: { not: null },
				},
				include: {
					equipment: true,
				},
			})

			const equipmentList = equipment
				.map((item) => item.equipment)
				.filter(Boolean)

			res.status(200).json(equipmentList)
			return
		} catch (error) {
			console.error('Error fetching equipment:', error)
			res.status(500).json({ error: 'Failed to fetch equipment' })
			return
		}
	}

	if (req.method === 'POST') {
		try {
			const validationResult = equipmentSchema.safeParse(req.body)

			if (!validationResult.success) {
				res.status(400).json({
					error: 'Invalid equipment data',
					details: validationResult.error.flatten().fieldErrors,
				})
				return
			}

			const { name, type, notes } = validationResult.data

			const equipment = await prisma.equipment.create({
				data: {
					name,
					type,
					notes,
					createdBy: userId,
				},
			})

			await prisma.brewBarEquipment.create({
				data: {
					barId: brewBarId,
					equipmentId: equipment.id,
				},
			})

			res.status(201).json(equipment)
			return
		} catch (error) {
			console.error('Error creating equipment:', error)
			res.status(500).json({ error: 'Failed to create equipment' })
			return
		}
	}

	res.status(405).json({ error: 'Method not allowed' })
	return
}

export default withAuth(handler)
