import { prisma } from '@/lib/prisma'

export async function getBeanById(id: number) {
	return prisma.bean.findUnique({
		where: { id },
		include: {
			brews: {
				orderBy: { createdAt: 'desc' },
				take: 10,
			},
		},
	})
}

export async function getBeansForBar(barId: number | null, userId: number) {
	return prisma.bean.findMany({
		where: {
			barId: barId,
			...(barId === null ? { createdBy: userId } : {}),
		},
		orderBy: { createdAt: 'desc' },
	})
}

interface CreateBeanInput {
	name: string
	roaster?: string
	origin?: string
	roastLevel?: string
	roastDate: string | Date
	freezeDate?: string | Date | null
	thawDate?: string | Date | null
	initialWeight: number
	remainingWeight?: number
	notes?: string
	barId?: number
	createdBy: number
}

export async function createBean(input: CreateBeanInput) {
	return prisma.bean.create({
		data: {
			name: input.name,
			roaster: input.roaster,
			origin: input.origin,
			roastLevel: input.roastLevel,
			roastDate: new Date(input.roastDate),
			freezeDate: input.freezeDate ? new Date(input.freezeDate) : null,
			thawDate: input.thawDate ? new Date(input.thawDate) : null,
			initialWeight: input.initialWeight,
			remainingWeight: input.remainingWeight ?? input.initialWeight,
			notes: input.notes,
			barId: input.barId ?? null,
			createdBy: input.createdBy,
		},
	})
}

export async function updateBean(id: number, input: Partial<CreateBeanInput>) {
	const data: any = { ...input }
	if (input.roastDate) data.roastDate = new Date(input.roastDate)
	if (input.freezeDate) data.freezeDate = new Date(input.freezeDate)
	if (input.thawDate) data.thawDate = new Date(input.thawDate)

	return prisma.bean.update({
		where: { id },
		data,
	})
}

export async function deleteBean(id: number) {
	const brewCount = await prisma.brew.count({ where: { beanId: id } })
	if (brewCount > 0) {
		throw new Error('Cannot delete bean with existing brews')
	}

	return prisma.bean.delete({
		where: { id },
	})
}
