import useSWR from 'swr'
import axios from 'axios'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBean(beanId: number | undefined) {
	const { data, error, isLoading, mutate } = useSWR<Bean>(
		typeof beanId === 'number' ? `/api/beans/${beanId}` : null,
		fetcher,
	)

	return { bean: data, isLoading, error, mutate }
}
