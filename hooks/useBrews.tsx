import useSWRInfinite from 'swr/infinite'
import axios from 'axios'
import type { Prisma } from '@/generated/prisma/client'

export type BrewWithRelations = Prisma.BrewGetPayload<{
	include: { bean: { select: { name: true; roaster: true } } }
}>

interface BrewsResponse {
	brews: BrewWithRelations[]
	nextId: number | null
	hasMore: boolean
}

interface UseBrewsPaginatedOptions {
	beanId?: string
	batchId?: string
	method?: string
	limit?: number
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data)

export function useBrewsPaginated({
	beanId,
	batchId,
	method,
	limit = 25,
}: UseBrewsPaginatedOptions = {}) {
	const getKey = (
		pageIndex: number,
		previousPageData: BrewsResponse | null,
	) => {
		if (process.env.NEXT_PUBLIC_LITE === 'true') return null
		if (previousPageData && !previousPageData.hasMore) return null

		const params = new URLSearchParams({ limit: String(limit) })
		if (beanId) params.set('beanId', beanId)
		if (batchId) params.set('batchId', batchId)
		if (method) params.set('method', method)
		if (pageIndex > 0 && previousPageData?.nextId) {
			params.set('cursor', String(previousPageData.nextId))
		}
		return `/api/brews?${params}`
	}

	const { data, error, isLoading, size, setSize, mutate } =
		useSWRInfinite<BrewsResponse>(getKey, fetcher, {
			revalidateFirstPage: false,
		})

	const brews = data?.flatMap((page) => page.brews) ?? []
	const hasMore = data?.at(-1)?.hasMore ?? false
	const isLoadingMore =
		isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')

	return {
		brews,
		isLoading,
		isLoadingMore,
		error,
		hasMore,
		loadMore: () => {
			if (!isLoadingMore && hasMore) setSize(size + 1)
		},
		refresh: () => void mutate(),
	}
}
