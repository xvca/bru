import { prisma } from '@/lib/prisma'

export async function getBrewBarsForUser(userId: number) {
	return prisma.brewBar.findMany({
		where: {
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
		orderBy: {
			createdAt: 'desc',
		},
	})
}

export async function getBrewBarById(id: number) {
	return prisma.brewBar.findUnique({
		where: { id },
		include: {
			members: {
				select: {
					userId: true,
					role: true,
				},
			},
		},
	})
}

interface CreateBrewBarInput {
	name: string
	location?: string | null | undefined
}

export async function createBrewBar(input: CreateBrewBarInput, userId: number) {
	return prisma.brewBar.create({
		data: {
			name: input.name,
			location: input.location,
			createdBy: userId,
			members: {
				create: {
					userId,
					role: 'Owner',
				},
			},
		},
	})
}

export async function updateBrewBar(
	id: number,
	input: Partial<CreateBrewBarInput>,
) {
	return prisma.brewBar.update({
		where: { id },
		data: input,
	})
}

export async function deleteBrewBar(id: number) {
	return prisma.$transaction([
		prisma.brewBarMember.deleteMany({
			where: { barId: id },
		}),
		prisma.brewBar.delete({
			where: { id },
		}),
	])
}

export async function getBrewBarMembers(barId: number) {
	return prisma.brewBarMember.findMany({
		where: { barId },
		include: {
			user: {
				select: {
					id: true,
					username: true,
				},
			},
		},
	})
}

export async function addBrewBarMember(
	barId: number,
	username: string,
	role: string = 'Member',
) {
	const userToInvite = await prisma.user.findUnique({
		where: { username },
	})

	if (!userToInvite) {
		throw new Error('User not found')
	}

	const existingMember = await prisma.brewBarMember.findUnique({
		where: {
			barId_userId: {
				barId,
				userId: userToInvite.id,
			},
		},
	})

	if (existingMember) {
		throw new Error('User is already a member')
	}

	return prisma.brewBarMember.create({
		data: {
			barId,
			userId: userToInvite.id,
			role,
		},
	})
}

export async function removeBrewBarMember(barId: number, memberUserId: number) {
	return prisma.brewBarMember.delete({
		where: {
			barId_userId: {
				barId,
				userId: memberUserId,
			},
		},
	})
}

export async function isBrewBarOwner(barId: number, userId: number) {
	const count = await prisma.brewBar.count({
		where: {
			id: barId,
			createdBy: userId,
		},
	})
	return count > 0
}

export async function isBrewBarMember(barId: number, userId: number) {
	const count = await prisma.brewBarMember.count({
		where: {
			barId,
			userId,
		},
	})
	return count > 0
}
