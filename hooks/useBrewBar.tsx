import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'

export interface BrewBarDetail {
	id: number
	name: string
	location: string | null
	createdAt: string
	createdBy: number
	isOwner: boolean
	role: string
	defaultRegularBean?: { id: number; name: string } | null
	defaultDecafBean?: { id: number; name: string } | null
}

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBrewBar(brewBarId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user?.token && typeof brewBarId === 'number'

	const { data, error, isLoading, mutate } = useSWR<BrewBarDetail>(
		shouldFetch ? [`/api/brew-bars/${brewBarId}`, user!.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		brewBar: data,
		isLoading,
		error,
		mutate,
	}
}
