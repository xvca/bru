import { prisma } from '@/lib/prisma'

export async function getGrinders(userId: number, barId?: number | null) {
	let whereClause: any = {}

	if (barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId, userId },
		})

		if (!membership) {
			throw new Error('Not a member of this bar')
		}
		whereClause = { barId }
	} else {
		whereClause = { createdBy: userId, barId: null }
	}

	return prisma.grinder.findMany({
		where: whereClause,
		orderBy: { name: 'asc' },
	})
}

export async function createGrinder(data: any, userId: number) {
	if (data.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: data.barId, userId },
		})
		if (!membership) throw new Error('Not a member of this bar')
	}

	return prisma.grinder.create({
		data: {
			...data,
			createdBy: userId,
			barId: data.barId || null,
		},
	})
}

export async function getGrinderById(id: number, userId: number) {
	const grinder = await prisma.grinder.findUnique({ where: { id } })
	if (!grinder) return null

	if (grinder.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: grinder.barId, userId },
		})
		if (!membership) throw new Error('Forbidden')
	} else {
		if (grinder.createdBy !== userId) throw new Error('Forbidden')
	}
	return grinder
}

export async function updateGrinder(id: number, data: any, userId: number) {
	const grinder = await prisma.grinder.findUnique({ where: { id } })
	if (!grinder) throw new Error('Not found')

	let canWrite = false
	if (grinder.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: grinder.barId, userId },
		})
		if (
			membership &&
			(grinder.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (grinder.createdBy === userId) canWrite = true
	}

	if (!canWrite) throw new Error('Forbidden')

	return prisma.grinder.update({
		where: { id },
		data,
	})
}

export async function deleteGrinder(id: number, userId: number) {
	const grinder = await prisma.grinder.findUnique({ where: { id } })
	if (!grinder) throw new Error('Not found')

	let canWrite = false
	if (grinder.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: grinder.barId, userId },
		})
		if (
			membership &&
			(grinder.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (grinder.createdBy === userId) canWrite = true
	}

	if (!canWrite) throw new Error('Forbidden')

	return prisma.grinder.delete({ where: { id } })
}
