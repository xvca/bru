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

	const beanNames = [...new Set(activeBeans.map((b) => b.name))]

	const relevantBrews = await prisma.brew.findMany({
		where: {
			barId,
			method: 'Espresso',
			bean: {
				name: { in: beanNames },
			},
		},
		orderBy: { createdAt: 'desc' },
		include: {
			bean: {
				select: {
					name: true,
					roaster: true,
					roastDate: true,
				},
			},
		},
	})

	const batchGroups: Record<string, typeof activeBeans> = {}
	activeBeans.forEach((bean) => {
		const key = `${bean.name}|${bean.roaster}|${new Date(bean.roastDate).toISOString().split('T')[0]}`
		if (!batchGroups[key]) batchGroups[key] = []
		batchGroups[key].push(bean)
	})

	const suggestions = []

	for (const beans of Object.values(batchGroups)) {
		const sample = beans[0]
		const sampleRoastTime = new Date(sample.roastDate).getTime()

		const matchingBrew = relevantBrews.find((brew) => {
			const b = brew.bean
			return (
				b.name === sample.name &&
				b.roaster === sample.roaster &&
				new Date(b.roastDate).getTime() === sampleRoastTime
			)
		})

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
