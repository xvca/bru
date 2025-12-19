import { prisma } from '@/lib/prisma'

export interface SuggestionResult {
	suggestions: any[]
	decafStartHour: number
}

export async function getSuggestionsForBar(
	barId: number,
	userId: number,
): Promise<SuggestionResult> {
	const [beans, user] = await Promise.all([
		prisma.bean.findMany({
			where: {
				barId,
				OR: [{ remainingWeight: { gt: 0 } }, { remainingWeight: null }],
				brews: {
					some: {
						method: 'Espresso',
						barId,
					},
				},
			},
			include: {
				brews: {
					where: {
						method: 'Espresso',
						barId,
					},
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
			},
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { decafStartHour: true },
		}),
	])

	const suggestions = beans
		.filter((bean) => bean.brews.length > 0)
		.map(({ brews, ...bean }) => ({
			...bean,
			lastBrew: brews[0],
		}))

	return {
		suggestions,
		decafStartHour: user?.decafStartHour ?? -1,
	}
}
