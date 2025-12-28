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

	if (data.roastDate) {
		data.roastDate = new Date(data.roastDate)
	}

	if ('freezeDate' in data) {
		data.freezeDate = data.freezeDate ? new Date(data.freezeDate) : null
	}

	if ('thawDate' in data) {
		data.thawDate = data.thawDate ? new Date(data.thawDate) : null
	}

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

export async function thawBean(id: number, weight: number, thawDate: Date) {
	const bean = await prisma.bean.findUnique({ where: { id } })
	if (!bean) throw new Error('Bean not found')
	if (!bean.freezeDate) throw new Error('Bean is not frozen')
	if (bean.remainingWeight === null)
		throw new Error('Bean has no remaining weight')
	if (weight > bean.remainingWeight)
		throw new Error('Cannot thaw more than remaining weight')

	return prisma.$transaction(async (tx) => {
		if (Math.abs(weight - bean.remainingWeight!) < 0.1) {
			return tx.bean.update({
				where: { id },
				data: { thawDate },
			})
		} else {
			await tx.bean.update({
				where: { id },
				data: { remainingWeight: bean.remainingWeight! - weight },
			})

			return tx.bean.create({
				data: {
					name: bean.name,
					roaster: bean.roaster,
					origin: bean.origin,
					roastLevel: bean.roastLevel,
					roastDate: bean.roastDate,
					freezeDate: bean.freezeDate,
					thawDate: thawDate,
					initialWeight: weight,
					remainingWeight: weight,
					notes: bean.notes,
					barId: bean.barId,
					createdBy: bean.createdBy,
				},
			})
		}
	})
}
