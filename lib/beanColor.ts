/** Batch swatch colour, shared by Beans, Shots and the auto-log sheet. */
export const getBatchColor = (str: string) => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash)
	}
	const hue = Math.abs(hash % 360)
	return `hsl(${hue}, 50%, 65%)`
}

export const beanColor = (bean: { id: number; batchId: string | null }) =>
	getBatchColor(bean.batchId || `fallback-${bean.id}`)
