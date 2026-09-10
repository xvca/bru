import { prisma } from '@/lib/prisma'

export interface SuggestionResult {
	suggestions: any[]
	decafStartHour: number
}

export async function getSuggestions(): Promise<SuggestionResult> {
	const [activeBeans, settings] = await Promise.all([
		prisma.bean.findMany({
			where: {
				OR: [{ remainingWeight: { gt: 0 } }, { remainingWeight: null }],
			},
		}),
		prisma.appSettings.findUnique({ where: { id: 1 } }),
	])

	if (activeBeans.length === 0) {
		return {
			suggestions: [],
			decafStartHour: settings?.decafStartHour ?? 23,
		}
	}

	const batchIds = [
		...new Set(
			activeBeans
				.map((bean) => bean.batchId)
				.filter((id): id is string => id !== null),
		),
	]
	const unbatchedBeanIds = activeBeans
		.filter((bean) => !bean.batchId)
		.map((bean) => bean.id)

	const relevantBrews = await prisma.brew.findMany({
		where: {
			method: 'Espresso',
			OR: [
				{ bean: { batchId: { in: batchIds } } },
				{ beanId: { in: unbatchedBeanIds } },
			],
		},
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		include: { bean: { select: { batchId: true } } },
	})

	const batchGroups: Record<string, typeof activeBeans> = {}
	for (const bean of activeBeans) {
		const key = bean.batchId || `fallback-${bean.id}`
		if (!batchGroups[key]) batchGroups[key] = []
		batchGroups[key].push(bean)
	}

	const suggestions = []
	for (const [batchId, beans] of Object.entries(batchGroups)) {
		const matchingBrew = relevantBrews.find((brew) => {
			if (brew.bean.batchId) return brew.bean.batchId === batchId
			return beans.some((bean) => bean.id === brew.beanId)
		})
		if (!matchingBrew) continue

		const bestBean = beans.sort((a, b) => {
			const isAReady = !a.freezeDate || !!a.thawDate
			const isBReady = !b.freezeDate || !!b.thawDate
			if (isAReady && !isBReady) return -1
			if (!isAReady && isBReady) return 1
			return b.id - a.id
		})[0]

		suggestions.push({ ...bestBean, lastBrew: matchingBrew })
	}

	return {
		suggestions,
		decafStartHour: settings?.decafStartHour ?? 23,
	}
}
