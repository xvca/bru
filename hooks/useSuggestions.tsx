import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { SmartSuggestion } from '@/components/SmartCarousel'

interface SuggestionsResponse {
	suggestions: SmartSuggestion[]
	decafStartHour: number
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useSuggestions() {
	const { user } = useAuth()
	const { activeBarId } = useBrewBar()

	const shouldFetch = !!user && !!activeBarId

	const { data, error, isLoading, mutate } = useSWR<SuggestionsResponse>(
		shouldFetch
			? [`/api/dashboard/suggestions?barId=${activeBarId}`, user!.id]
			: null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		suggestions: data?.suggestions ?? [],
		decafStartHour: data?.decafStartHour ?? -1,
		isLoading,
		error,
		refresh: mutate,
	}
}
