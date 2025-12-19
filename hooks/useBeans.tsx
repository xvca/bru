import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBeans() {
	const { user } = useAuth()
	const { activeBarId } = useBrewBar()

	const barIdParam = activeBarId === null ? 'null' : activeBarId

	const shouldFetch = !!user?.token

	const { data, error, isLoading, mutate } = useSWR<Bean[]>(
		shouldFetch ? [`/api/beans?barId=${barIdParam}`, user!.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		beans: data ?? [],
		isLoading,
		error,
		refresh: mutate,
	}
}
