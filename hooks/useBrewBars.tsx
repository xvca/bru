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

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrewBars() {
	const { user } = useAuth()

	const { data, error, isLoading, mutate } = useSWR<BrewBar[]>(
		user ? ['/api/brew-bars', user.id] : null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		brewBars: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}
