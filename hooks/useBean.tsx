import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import type { Bean } from '@/generated/prisma/client'

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBean(beanId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user?.token && typeof beanId === 'number'

	const { data, error, isLoading, mutate } = useSWR<Bean>(
		shouldFetch ? [`/api/beans/${beanId}`, user!.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		bean: data,
		isLoading,
		error,
		mutate,
	}
}
