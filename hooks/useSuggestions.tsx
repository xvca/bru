import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { SmartSuggestion } from '@/components/SmartCarousel'

interface SuggestionsResponse {
	suggestions: SmartSuggestion[]
	decafStartHour: number
}

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useSuggestions() {
	const { user } = useAuth()
	const { activeBarId } = useBrewBar()

	const shouldFetch = !!user?.token && !!activeBarId

	const { data, error, isLoading, mutate } = useSWR<SuggestionsResponse>(
		shouldFetch
			? [`/api/dashboard/suggestions?barId=${activeBarId}`, user!.token]
			: null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		suggestions: data?.suggestions ?? [],
		decafStartHour: data?.decafStartHour ?? -1,
		isLoading,
		error,
		refresh: mutate,
	}
}
