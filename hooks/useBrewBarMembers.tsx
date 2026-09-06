import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'

export interface BrewBarMember {
	barId: number
	userId: number
	role: string
	joinedAt: string
	user: {
		id: number
		username: string
	}
	isCurrentUser: boolean
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrewBarMembers(brewBarId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user && typeof brewBarId === 'number'

	const { data, error, isLoading, mutate } = useSWR<BrewBarMember[]>(
		shouldFetch ? [`/api/brew-bars/${brewBarId}/members`, user!.id] : null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		members: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}
