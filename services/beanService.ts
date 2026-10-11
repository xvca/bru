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

type BagWeights = { remainingWeight: number | null; frozenWeight: number }

/**
 * Take grams out of a bag (or put them back when negative). Shots come out
 * of the open grams first; anything beyond that must have come from the
 * freezer (ground from frozen, or a thaw that wasn't logged), so it comes
 * off the frozen amount rather than being lost.
 */
export function drawFromBag(bag: BagWeights, grams: number) {
	if (bag.remainingWeight === null) return null
	if (grams <= 0) {
		return {
			remainingWeight: bag.remainingWeight - grams,
			frozenWeight: bag.frozenWeight,
		}
	}
	const open = Math.max(0, bag.remainingWeight - bag.frozenWeight)
	const remainingWeight = Math.max(0, bag.remainingWeight - grams)
	const fromFrozen = Math.max(0, grams - open)
	return {
		remainingWeight,
		frozenWeight: Math.min(
			remainingWeight,
			Math.max(0, bag.frozenWeight - fromFrozen),
		),
	}
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
	const remainingWeight = data.remainingWeight ?? data.initialWeight
	return prisma.bean.create({
		data: {
			...data,
			batchId: uuidv4(),
			remainingWeight,
			// A freeze date means the whole bag went into the freezer
			frozenWeight: data.freezeDate ? remainingWeight : 0,
		},
	})
}

export async function updateBean(id: number, input: unknown) {
	const data = parseBeanInput(input)
	return prisma.$transaction(async (tx) => {
		const bean = await tx.bean.findUnique({ where: { id } })
		if (!bean) throw new ApiError(404, 'Bean not found')

		const remaining = data.remainingWeight ?? bean.remainingWeight
		let frozenWeight = bean.frozenWeight
		let thawDate = bean.thawDate
		if (data.freezeDate && !bean.freezeDate) {
			// Newly frozen: whatever is left goes in
			frozenWeight = remaining ?? 0
			thawDate = null
		} else if (!data.freezeDate && bean.freezeDate) {
			// Freeze date cleared: nothing is frozen any more
			frozenWeight = 0
			thawDate = null
		}
		if (remaining !== null) frozenWeight = Math.min(frozenWeight, remaining)

		return tx.bean.update({
			where: { id },
			data: { ...data, frozenWeight: Math.max(0, frozenWeight), thawDate },
		})
	})
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
		data: { remainingWeight: 0, frozenWeight: 0 },
	})
}

/** Move grams from the freezer to the open bag; thawDate is the latest thaw */
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
		if (bean.frozenWeight <= 0) {
			throw new ApiError(400, 'Bean has nothing frozen')
		}
		if (weight > bean.frozenWeight + 0.1) {
			throw new ApiError(400, 'Cannot thaw more than is frozen')
		}
		// Within a rounding step of everything counts as thawing it all
		const frozenWeight =
			bean.frozenWeight - weight < 0.1 ? 0 : bean.frozenWeight - weight
		return tx.bean.update({
			where: { id },
			data: { frozenWeight, thawDate, lastThawWeight: weight },
		})
	})
}
