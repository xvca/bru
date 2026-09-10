import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { beanSchema } from '@/lib/validators'
import { ApiError } from '@/lib/api/validation'

export async function getBeanById(id: number) {
	return prisma.bean.findUnique({
		where: { id },
		include: {
			brews: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10 },
		},
	})
}

export async function getBeans() {
	return prisma.bean.findMany({ orderBy: { createdAt: 'desc' } })
}

function parseBeanInput(input: unknown) {
	const data = beanSchema.parse(input)
	return {
		...data,
		roastDate: new Date(data.roastDate),
		freezeDate: data.freezeDate ? new Date(data.freezeDate) : null,
	}
}

export async function createBean(input: unknown) {
	const data = parseBeanInput(input)
	return prisma.bean.create({
		data: {
			...data,
			batchId: uuidv4(),
			remainingWeight: data.remainingWeight ?? data.initialWeight,
		},
	})
}

export async function updateBean(id: number, input: unknown) {
	return prisma.bean.update({ where: { id }, data: parseBeanInput(input) })
}

export async function deleteBean(id: number) {
	return prisma.$transaction(async (tx) => {
		if (await tx.brew.count({ where: { beanId: id } })) {
			throw new ApiError(409, 'Cannot delete bean with existing brews')
		}
		return tx.bean.delete({ where: { id } })
	})
}

export async function markBeanAsEmpty(id: number) {
	return prisma.bean.update({
		where: { id },
		data: { remainingWeight: 0 },
	})
}

export async function thawBean(id: number, weight: number, thawDate: Date) {
	if (
		!Number.isFinite(weight) ||
		weight <= 0 ||
		!Number.isFinite(thawDate.getTime())
	) {
		throw new ApiError(400, 'Invalid thaw weight or date')
	}

	return prisma.$transaction(async (tx) => {
		const bean = await tx.bean.findUnique({ where: { id } })
		if (!bean) throw new ApiError(404, 'Bean not found')
		if (!bean.freezeDate || bean.thawDate) {
			throw new ApiError(400, 'Bean is not currently frozen')
		}
		if (bean.remainingWeight === null || weight > bean.remainingWeight) {
			throw new ApiError(400, 'Cannot thaw more than remaining weight')
		}
		if (Math.abs(weight - bean.remainingWeight) < 0.1) {
			return tx.bean.update({ where: { id }, data: { thawDate } })
		}

		await tx.bean.update({
			where: { id },
			data: { remainingWeight: bean.remainingWeight - weight },
		})
		const { id: _id, createdAt: _createdAt, ...data } = bean
		return tx.bean.create({
			data: {
				...data,
				thawDate,
				initialWeight: weight,
				remainingWeight: weight,
			},
		})
	})
}
