import useSWR from 'swr'
import axios from 'axios'
import type { Prisma } from '@/generated/prisma/client'

export type BrewDetail = Prisma.BrewGetPayload<{
	include: { bean: true; brewer: true; grinder: true }
}>

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrew(brewId: number | undefined) {
	const { data, error, isLoading, mutate } = useSWR<BrewDetail>(
		typeof brewId === 'number' ? `/api/brews/${brewId}` : null,
		fetcher,
	)
	return { brew: data, isLoading, error, mutate }
}
