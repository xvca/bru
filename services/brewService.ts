import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { brewSchema, type BrewFormData } from '@/lib/validators'
import { ApiError } from '@/lib/api/validation'

interface GetBrewsOptions {
	cursor?: number
	limit?: number
	filters?: { beanId?: number; batchId?: string; method?: string }
}

export function getBrews(options: GetBrewsOptions = {}) {
	return prisma.brew.findMany({
		...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
		where: {
			...(options.filters?.batchId
				? { bean: { batchId: options.filters.batchId } }
				: { beanId: options.filters?.beanId }),
			method: options.filters?.method,
		},
		include: {
			bean: { select: { name: true, roaster: true } },
		},
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take: (options.limit ?? 25) + 1,
	})
}

export function getBrewById(id: number) {
	return prisma.brew.findUnique({
		where: { id },
		include: { bean: true, brewer: true, grinder: true },
	})
}

async function validateRecipe(
	tx: Prisma.TransactionClient,
	input: BrewFormData,
) {
	const bean = await tx.bean.findUnique({ where: { id: input.beanId } })
	if (!bean) throw new ApiError(400, 'Bean not found')
	if (
		input.brewerId &&
		!(await tx.brewer.findUnique({ where: { id: input.brewerId } }))
	) {
		throw new ApiError(400, 'Brewer not found')
	}
	if (
		input.grinderId &&
		!(await tx.grinder.findUnique({ where: { id: input.grinderId } }))
	) {
		throw new ApiError(400, 'Grinder not found')
	}
	return bean
}

export async function createBrew(raw: unknown) {
	const input = brewSchema.parse(raw)
	return prisma.$transaction(async (tx) => {
		const bean = await validateRecipe(tx, input)
		const brew = await tx.brew.create({ data: input })
		if (bean.remainingWeight !== null) {
			await tx.bean.update({
				where: { id: bean.id },
				data: {
					remainingWeight: Math.max(0, bean.remainingWeight - input.doseWeight),
				},
			})
		}
		return brew
	})
}

export async function updateBrew(id: number, raw: unknown) {
	const input = brewSchema.parse(raw)
	return prisma.$transaction(async (tx) => {
		const existing = await tx.brew.findUnique({ where: { id } })
		if (!existing) throw new ApiError(404, 'Brew not found')
		const bean = await validateRecipe(tx, input)

		if (existing.beanId === input.beanId) {
			if (bean.remainingWeight !== null) {
				await tx.bean.update({
					where: { id: bean.id },
					data: {
						remainingWeight: Math.max(
							0,
							bean.remainingWeight - (input.doseWeight - existing.doseWeight),
						),
					},
				})
			}
		} else {
			const oldBean = await tx.bean.findUnique({
				where: { id: existing.beanId },
			})
			if (oldBean && oldBean.remainingWeight !== null) {
				await tx.bean.update({
					where: { id: oldBean.id },
					data: {
						remainingWeight: oldBean.remainingWeight + existing.doseWeight,
					},
				})
			}
			if (bean.remainingWeight !== null) {
				await tx.bean.update({
					where: { id: bean.id },
					data: {
						remainingWeight: Math.max(
							0,
							bean.remainingWeight - input.doseWeight,
						),
					},
				})
			}
		}
		return tx.brew.update({ where: { id }, data: input })
	})
}

export function deleteBrew(id: number) {
	return prisma.brew.delete({ where: { id } })
}
