import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBean(beanId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user && typeof beanId === 'number'

	const { data, error, isLoading, mutate } = useSWR<Bean>(
		shouldFetch ? [`/api/beans/${beanId}`, user!.id] : null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		bean: data,
		isLoading,
		error,
		mutate,
	}
}
