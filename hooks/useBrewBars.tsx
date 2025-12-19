import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'

export interface BrewBar {
	id: number
	name: string
	location: string | null
	createdAt: string
	isOwner: boolean
	memberCount: number
	role: string
}

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBrewBars() {
	const { user } = useAuth()

	const { data, error, isLoading, mutate } = useSWR<BrewBar[]>(
		user?.token ? ['/api/brew-bars', user.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		brewBars: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}
