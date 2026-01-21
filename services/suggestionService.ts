import { prisma } from '@/lib/prisma'

export interface SuggestionResult {
	suggestions: any[]
	decafStartHour: number
}

export async function getSuggestionsForBar(
	barId: number,
	userId: number,
): Promise<SuggestionResult> {
	const [activeBeans, user] = await Promise.all([
		prisma.bean.findMany({
			where: {
				barId,
				OR: [{ remainingWeight: { gt: 0 } }, { remainingWeight: null }],
			},
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { decafStartHour: true },
		}),
	])

	if (activeBeans.length === 0) {
		return {
			suggestions: [],
			decafStartHour: user?.decafStartHour ?? -1,
		}
	}

	const batchIds = [...new Set(activeBeans.map((b) => b.batchId).filter((id): id is string => id !== null))]

	const relevantBrews = await prisma.brew.findMany({
		where: {
			barId,
			method: 'Espresso',
			bean: {
				batchId: { in: batchIds },
			},
		},
		orderBy: { createdAt: 'desc' },
		include: {
			bean: {
				select: {
					batchId: true,
				},
			},
		},
	})

	const batchGroups: Record<string, typeof activeBeans> = {}
	activeBeans.forEach((bean) => {
		const key = bean.batchId || `fallback-${bean.id}`
		if (!batchGroups[key]) batchGroups[key] = []
		batchGroups[key].push(bean)
	})

	const suggestions = []

	for (const [batchId, beans] of Object.entries(batchGroups)) {
		const matchingBrew = relevantBrews.find((brew) => brew.bean.batchId === batchId)

		if (!matchingBrew) continue

		const bestBean = beans.sort((a, b) => {
			const isAReady = !a.freezeDate || !!a.thawDate
			const isBReady = !b.freezeDate || !!b.thawDate

			if (isAReady && !isBReady) return -1
			if (!isAReady && isBReady) return 1

			return b.id - a.id
		})[0]

		suggestions.push({
			...bestBean,
			lastBrew: matchingBrew,
		})
	}

	return {
		suggestions,
		decafStartHour: user?.decafStartHour ?? -1,
	}
}
