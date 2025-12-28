import { prisma } from '@/lib/prisma'

export async function getBrewers(userId: number, barId?: number | null) {
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

	return prisma.brewer.findMany({
		where: whereClause,
		orderBy: { name: 'asc' },
	})
}

export async function createBrewer(data: any, userId: number) {
	if (data.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: data.barId, userId },
		})
		if (!membership) throw new Error('Not a member of this bar')
	}

	return prisma.brewer.create({
		data: {
			...data,
			createdBy: userId,
			barId: data.barId || null,
		},
	})
}

export async function getBrewerById(id: number, userId: number) {
	const brewer = await prisma.brewer.findUnique({ where: { id } })
	if (!brewer) return null

	if (brewer.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: brewer.barId, userId },
		})
		if (!membership) throw new Error('Forbidden')
	} else {
		if (brewer.createdBy !== userId) throw new Error('Forbidden')
	}
	return brewer
}

export async function updateBrewer(id: number, data: any, userId: number) {
	const brewer = await prisma.brewer.findUnique({ where: { id } })
	if (!brewer) throw new Error('Not found')

	let canWrite = false
	if (brewer.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: brewer.barId, userId },
		})
		if (
			membership &&
			(brewer.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (brewer.createdBy === userId) canWrite = true
	}

	if (!canWrite) throw new Error('Forbidden')

	return prisma.brewer.update({
		where: { id },
		data,
	})
}

export async function deleteBrewer(id: number, userId: number) {
	const brewer = await prisma.brewer.findUnique({ where: { id } })
	if (!brewer) throw new Error('Not found')

	let canWrite = false
	if (brewer.barId) {
		const membership = await prisma.brewBarMember.findFirst({
			where: { barId: brewer.barId, userId },
		})
		if (
			membership &&
			(brewer.createdBy === userId ||
				['Owner', 'Admin'].includes(membership.role || ''))
		) {
			canWrite = true
		}
	} else {
		if (brewer.createdBy === userId) canWrite = true
	}

	if (!canWrite) throw new Error('Forbidden')

	return prisma.brewer.delete({ where: { id } })
}
