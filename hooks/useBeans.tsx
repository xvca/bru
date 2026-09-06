import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBeans() {
	const { user } = useAuth()
	const { activeBarId } = useBrewBar()

	const barIdParam = activeBarId === null ? 'null' : activeBarId

	const shouldFetch = !!user

	const { data, error, isLoading, mutate } = useSWR<Bean[]>(
		shouldFetch ? [`/api/beans?barId=${barIdParam}`, user!.id] : null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		beans: data ?? [],
		isLoading,
		error,
		refresh: mutate,
	}
}
