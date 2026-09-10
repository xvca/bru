import { prisma } from '@/lib/prisma'
import { grinderSchema } from '@/lib/validators'
import { ApiError } from '@/lib/api/validation'

export function getGrinders() {
	return prisma.grinder.findMany({ orderBy: { id: 'desc' } })
}

export function getGrinderById(id: number) {
	return prisma.grinder.findUnique({ where: { id } })
}

export function createGrinder(input: unknown) {
	return prisma.grinder.create({ data: grinderSchema.parse(input) })
}

export async function updateGrinder(id: number, input: unknown) {
	if (
		!(await prisma.grinder.findUnique({ where: { id }, select: { id: true } }))
	) {
		throw new ApiError(404, 'Grinder not found')
	}
	return prisma.grinder.update({
		where: { id },
		data: grinderSchema.parse(input),
	})
}

export function deleteGrinder(id: number) {
	return prisma.grinder.delete({ where: { id } })
}
