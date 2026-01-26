import { prisma } from '@/lib/prisma'

interface GetBrewsOptions {
	cursor?: number
	limit?: number
	filters?: {
		beanId?: number
		batchId?: string
		method?: string
	}
}

export async function getBrews(
	userId: number,
	barId?: number | null,
	options?: GetBrewsOptions,
) {
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
		whereClause = {
			userId: userId,
			barId: null,
		}
	}

	if (options?.filters) {
		const { beanId, batchId, method } = options.filters

		if (batchId) {
			whereClause.bean = { batchId }
		} else if (beanId) {
			whereClause.beanId = beanId
		}

		if (method) {
			whereClause.method = method
		}
	}

	const limit = options?.limit ?? 25
	const effectiveLimit = Math.min(limit, 100)

	const brews = await prisma.brew.findMany({
		...(options?.cursor && {
			cursor: { id: options.cursor },
			skip: 1,
		}),
		where: whereClause,
		include: {
			bean: { select: { name: true, roaster: true } },
			user: { select: { id: true, username: true } },
			brewBar: { select: { id: true, name: true } },
		},
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take: effectiveLimit,
	})

	return brews
}

export async function getBrewById(id: number, userId: number) {
	const brew = await prisma.brew.findUnique({
		where: { id },
		include: {
			bean: true,
			brewer: true,
			grinder: true,
			brewBar: true,
		},
	})

	if (!brew) return null

	if (brew.userId !== userId) {
		if (brew.barId) {
			const membership = await prisma.brewBarMember.findFirst({
				where: { barId: brew.barId, userId },
			})
			if (!membership) return null
		} else {
			return null
		}
	}

	return brew
}

interface CreateBrewInput {
	beanId: number
	method: string
	doseWeight: number
	yieldWeight?: number | null
	brewTime?: number | null
	grindSize?: number | null
	waterTemperature?: number | null
	rating?: number | null
	notes?: string | null
	barId?: number | null
	brewerId?: number | null
	grinderId?: number | null
}

export async function createBrew(input: CreateBrewInput, userId: number) {
	return prisma.$transaction(async (tx) => {
		const brew = await tx.brew.create({
			data: {
				userId,
				...input,
			},
		})

		const bean = await tx.bean.findUnique({ where: { id: input.beanId } })
		if (bean && bean.remainingWeight !== null) {
			const newWeight = Math.max(0, bean.remainingWeight - input.doseWeight)
			await tx.bean.update({
				where: { id: input.beanId },
				data: { remainingWeight: newWeight },
			})
		}

		return brew
	})
}

export async function updateBrew(
	id: number,
	input: CreateBrewInput,
	userId: number,
) {
	const existingBrew = await prisma.brew.findFirst({
		where: { id, userId },
	})

	if (!existingBrew) {
		throw new Error("Brew not found or you don't have permission to update it")
	}

	return prisma.$transaction(async (tx) => {
		if (existingBrew.beanId === input.beanId) {
			const weightDiff = input.doseWeight - existingBrew.doseWeight

			if (weightDiff !== 0) {
				const bean = await tx.bean.findUnique({ where: { id: input.beanId } })
				if (bean && bean.remainingWeight !== null) {
					const newWeight = Math.max(0, bean.remainingWeight - weightDiff)
					await tx.bean.update({
						where: { id: input.beanId },
						data: { remainingWeight: newWeight },
					})
				}
			}
		} else {
			const oldBean = await tx.bean.findUnique({
				where: { id: existingBrew.beanId },
			})
			if (oldBean && oldBean.remainingWeight !== null) {
				await tx.bean.update({
					where: { id: existingBrew.beanId },
					data: {
						remainingWeight: oldBean.remainingWeight + existingBrew.doseWeight,
					},
				})
			}

			const newBean = await tx.bean.findUnique({ where: { id: input.beanId } })
			if (newBean && newBean.remainingWeight !== null) {
				await tx.bean.update({
					where: { id: input.beanId },
					data: {
						remainingWeight: Math.max(
							0,
							newBean.remainingWeight - input.doseWeight,
						),
					},
				})
			}
		}

		return await tx.brew.update({
			where: { id },
			data: input,
		})
	})
}

export async function deleteBrew(id: number, userId: number) {
	const existingBrew = await prisma.brew.findFirst({
		where: { id, userId },
	})

	if (!existingBrew) {
		throw new Error("Brew not found or you don't have permission to delete it")
	}

	return prisma.brew.delete({
		where: { id },
	})
}
