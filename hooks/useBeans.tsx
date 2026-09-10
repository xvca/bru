import useSWR from 'swr'
import axios from 'axios'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBeans() {
	const { data, error, isLoading, mutate } = useSWR<Bean[]>(
		process.env.NEXT_PUBLIC_LITE === 'true' ? null : '/api/beans',
		fetcher,
	)

	return {
		beans: data ?? [],
		isLoading,
		error,
		refresh: mutate,
	}
}
