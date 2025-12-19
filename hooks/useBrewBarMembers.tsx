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

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBrewBarMembers(brewBarId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user?.token && typeof brewBarId === 'number'

	const { data, error, isLoading, mutate } = useSWR<BrewBarMember[]>(
		shouldFetch ? [`/api/brew-bars/${brewBarId}/members`, user!.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		members: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}
