type BagWeights = {
	initialWeight: number
	remainingWeight: number | null
	frozenWeight: number
}

/** Grams out of the freezer and ready to brew */
export function openGrams(bean: BagWeights) {
	return Math.max(
		0,
		(bean.remainingWeight ?? bean.initialWeight) - bean.frozenWeight,
	)
}

/** Everything left in the bag is still in the freezer */
export function isAllFrozen(bean: BagWeights) {
	return bean.frozenWeight > 0 && openGrams(bean) === 0
}
