import useSWR from 'swr'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { Prisma } from '@/generated/prisma/client'

export type BrewWithRelations = Prisma.BrewGetPayload<{
	include: {
		bean: { select: { name: true; roaster: true } }
		user: { select: { id: true; username: true } }
		brewBar: { select: { id: true; name: true } }
	}
}>

const fetcher = (url: string, token: string, barId?: number | null) =>
	axios
		.get(url, {
			headers: { Authorization: `Bearer ${token}` },
			params: { barId },
		})
		.then((res) => res.data)

export function useBrews(barId?: number | null) {
	const { user } = useAuth()

	const shouldFetch = !!user?.token

	const { data, error, isLoading, mutate } = useSWR<BrewWithRelations[]>(
		shouldFetch ? ['/api/brews', user!.token, barId] : null,
		([url, token, bId]: [string, string, number | undefined]) =>
			fetcher(url, token, bId),
	)

	return {
		brews: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}
