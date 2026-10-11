/** Seconds as "28 s", or m:ss from a minute up */
export const formatDuration = (seconds: number | null | undefined) => {
	if (!seconds) return null
	if (seconds < 60) return `${seconds} s`
	const m = Math.floor(seconds / 60)
	const s = Math.round(seconds % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}
