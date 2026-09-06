import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
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

interface BrewsResponse {
	brews: BrewWithRelations[]
	nextId: number | null
	hasMore: boolean
}

const fetcher = (url: string, barId?: number | null) =>
	axios.get(url, { params: { barId } }).then((res) => res.data)

const paginatedFetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrews(barId?: number | null) {
	const { user } = useAuth()

	if (process.env.NODE_ENV === 'development') {
		console.warn('useBrews is deprecated, use useBrewsPaginated instead')
	}

	const shouldFetch = !!user

	const { data, error, isLoading, mutate } = useSWR<BrewWithRelations[]>(
		shouldFetch ? ['/api/brews', user!.id, barId] : null,
		([url, , bId]: [string, number, number | undefined | null]) =>
			fetcher(url, bId),
	)

	return {
		brews: data || [],
		isLoading,
		error,
		refresh: mutate,
	}
}

interface UseBrewsPaginatedOptions {
	barId?: number | null
	beanId?: string
	batchId?: string
	method?: string
	limit?: number
}

export function useBrewsPaginated({
	barId,
	beanId,
	batchId,
	method,
	limit = 25,
}: UseBrewsPaginatedOptions = {}) {
	const { user } = useAuth()
	const shouldFetch = !!user

	const getKey = (
		pageIndex: number,
		previousPageData: BrewsResponse | null,
	) => {
		if (!shouldFetch) return null
		if (previousPageData && !previousPageData.hasMore) return null

		const params = new URLSearchParams()
		if (barId !== null && barId !== undefined)
			params.set('barId', String(barId))
		if (beanId) params.set('beanId', beanId)
		if (batchId) params.set('batchId', batchId)
		if (method) params.set('method', method)
		params.set('limit', String(limit))

		if (pageIndex > 0 && previousPageData?.nextId) {
			params.set('cursor', String(previousPageData.nextId))
		}

		return [`/api/brews?${params.toString()}`, user!.id] as const
	}

	const { data, error, isLoading, isValidating, size, setSize, mutate } =
		useSWRInfinite<BrewsResponse>(
			getKey,
			([url]: readonly [string, number]) => paginatedFetcher(url),
			{
				revalidateFirstPage: false,
			},
		)

	const brews = data?.flatMap((page) => page.brews) ?? []
	const hasMore = data?.[data.length - 1]?.hasMore ?? false
	const isLoadingMore =
		isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')

	const loadMore = () => {
		if (!isLoadingMore && hasMore) {
			setSize(size + 1)
		}
	}

	const refresh = () => {
		mutate()
	}

	return {
		brews,
		isLoading,
		isLoadingMore,
		error,
		hasMore,
		loadMore,
		refresh,
	}
}
