import useSWR from 'swr'
import axios from 'axios'
import type { SmartSuggestion } from '@/components/SmartCarousel'

interface SuggestionsResponse {
	suggestions: SmartSuggestion[]
	decafStartHour: number
}

export const SUGGESTIONS_KEY = '/api/dashboard/suggestions'
const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useSuggestions() {
	const { data, error, isLoading, mutate } = useSWR<SuggestionsResponse>(
		process.env.NEXT_PUBLIC_LITE === 'true' ? null : SUGGESTIONS_KEY,
		fetcher,
	)

	return {
		suggestions: data?.suggestions ?? [],
		decafStartHour: data?.decafStartHour ?? -1,
		isLoading,
		error,
		refresh: mutate,
	}
}
