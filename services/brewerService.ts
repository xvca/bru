import { prisma } from '@/lib/prisma'
import { brewerSchema } from '@/lib/validators'
import { ApiError } from '@/lib/api/validation'

export function getBrewers() {
	return prisma.brewer.findMany({ orderBy: { id: 'desc' } })
}

export function getBrewerById(id: number) {
	return prisma.brewer.findUnique({ where: { id } })
}

export function createBrewer(input: unknown) {
	return prisma.brewer.create({ data: brewerSchema.parse(input) })
}

export async function updateBrewer(id: number, input: unknown) {
	if (
		!(await prisma.brewer.findUnique({ where: { id }, select: { id: true } }))
	) {
		throw new ApiError(404, 'Brewer not found')
	}
	return prisma.brewer.update({
		where: { id },
		data: brewerSchema.parse(input),
	})
}

export function deleteBrewer(id: number) {
	return prisma.brewer.delete({ where: { id } })
}
