import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Prisma } from '@/generated/prisma/client'

export type BrewDetail = Prisma.BrewGetPayload<{
	include: {
		bean: true
		brewer: true
		grinder: true
		brewBar: true
	}
}>

const fetcher = (url: string, token: string) =>
	axios
		.get(url, { headers: { Authorization: `Bearer ${token}` } })
		.then((res) => res.data)

export function useBrew(brewId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user?.token && typeof brewId === 'number'

	const { data, error, isLoading, mutate } = useSWR<BrewDetail>(
		shouldFetch ? [`/api/brews/${brewId}`, user!.token] : null,
		([url, token]: [string, string]) => fetcher(url, token),
	)

	return {
		brew: data,
		isLoading,
		error,
		mutate,
	}
}
