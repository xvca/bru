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

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrew(brewId: number | undefined) {
	const { user } = useAuth()

	const shouldFetch = !!user && typeof brewId === 'number'

	const { data, error, isLoading, mutate } = useSWR<BrewDetail>(
		shouldFetch ? [`/api/brews/${brewId}`, user!.id] : null,
		([url]: [string, number]) => fetcher(url),
	)

	return {
		brew: data,
		isLoading,
		error,
		mutate,
	}
}
