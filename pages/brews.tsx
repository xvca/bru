import Page, { PageHeader } from '@/components/Page'
import { AnimatePresence, motion } from 'framer-motion'
import { FadeIn, collapse } from '@/components/kit/FadeIn'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { format, isToday, isYesterday } from 'date-fns'
import { toast } from 'sonner'
import { useBrewsPaginated } from '@/hooks/useBrews'
import { useBeans } from '@/hooks/useBeans'
import BrewForm from '@/components/BrewFormModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { cn } from '@/lib/utils'
import { BREW_METHODS } from '@/lib/validators'
import type { BrewFormData } from '@/lib/validators'
import type { BrewWithRelations } from '@/hooks/useBrews'
import { beanColor, getBatchColor } from '@/lib/beanColor'
import { formatDuration } from '@/lib/format'

import { AddKey, Chip, IconButton, TextButton } from '@/components/kit/buttons'
import { RowMenu } from '@/components/kit/RowMenu'
import { Swatch } from '@/components/kit/rows'
import { EmptyState, RowSkeleton } from '@/components/kit/states'
import { isAllFrozen } from '@/lib/beans'
import {
	BoltIcon,
	CloneIcon,
	EditIcon,
	SlidersIcon,
	StarIcon,
	TrashIcon,
} from '@/components/kit/icons'

const fmt1 = (n: number) => n.toFixed(1)

const dayLabel = (d: Date) => {
	if (isToday(d)) return `Today · ${format(d, 'EEE d MMM')}`
	if (isYesterday(d)) return `Yesterday · ${format(d, 'EEE d MMM')}`
	return format(d, 'EEE d MMM')
}

export default function Brews() {
	const router = useRouter()
	const { beans } = useBeans()
	const sentinelRef = useRef<HTMLDivElement>(null)
	const filtersRef = useRef<HTMLDivElement>(null)

	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBrew, setSelectedBrew] = useState<number | undefined>(
		undefined,
	)
	const [cloneData, setCloneData] = useState<Partial<BrewFormData> | undefined>(
		undefined,
	)
	const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

	const [deleteModal, setDeleteModal] = useState({
		isOpen: false,
		brewId: 0,
		brewName: '',
	})

	const [filterBeanId, setFilterBeanId] = useState<string>('')
	const [filterBatchId, setFilterBatchId] = useState<string>('')
	const [filterMethod, setFilterMethod] = useState<string>('')
	const [showFilters, setShowFilters] = useState(false)

	const { brews, isLoading, isLoadingMore, hasMore, loadMore, refresh } =
		useBrewsPaginated({
			beanId: filterBeanId,
			batchId: filterBatchId,
			method: filterMethod,
		})

	useEffect(() => {
		const { beanId, batchId, method } = router.query

		if (batchId && beans) {
			const beanInBatch = beans.find((b) => b.batchId === batchId)
			setFilterBeanId(beanInBatch?.id.toString() || '')
			setFilterBatchId(batchId as string)
		} else {
			setFilterBeanId((beanId as string) || '')
			setFilterBatchId('')
		}

		setFilterMethod((method as string) || '')
		if (method) setShowFilters(true)
	}, [router.query, beans])

	const updateFilters = (
		bean: { beanId?: string; batchId?: string },
		method: string,
	) => {
		const query: Record<string, string> = {}
		if (bean.batchId) query.batchId = bean.batchId
		else if (bean.beanId) query.beanId = bean.beanId
		if (method) query.method = method

		router.push({ pathname: router.pathname, query }, undefined, {
			shallow: true,
		})

		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const currentBeanFilter = {
		beanId: filterBeanId,
		batchId: filterBatchId,
	}

	const hasActiveFilters = filterBeanId || filterBatchId || filterMethod

	// Arriving with a filter (e.g. Beans → View shots) shows the panel
	useEffect(() => {
		if (router.isReady && hasActiveFilters) setShowFilters(true)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only on arrival
	}, [router.isReady])

	// Keep the selected chips in view when filters come from the URL
	useEffect(() => {
		filtersRef.current
			?.querySelectorAll('[aria-pressed="true"]')
			.forEach((el) =>
				el.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
			)
	}, [filterBeanId, filterBatchId, filterMethod, showFilters, beans])

	// One chip per batch: active bags, plus whatever is currently filtered
	const beanChips = useMemo(() => {
		const seen = new Set<string>()
		return (
			beans
				.filter(
					(b) =>
						b.remainingWeight !== 0 ||
						b.id.toString() === filterBeanId ||
						(filterBatchId && b.batchId === filterBatchId),
				)
				// Open bags first, frozen after, newest first within each
				.sort((a, b) => {
					const fa = isAllFrozen(a) ? 1 : 0
					const fb = isAllFrozen(b) ? 1 : 0
					return fa - fb || b.id - a.id
				})
				.filter((b) => {
					const key = b.batchId || `fallback-${b.id}`
					if (seen.has(key)) return false
					seen.add(key)
					return true
				})
		)
	}, [beans, filterBeanId, filterBatchId])

	const isChipOn = (b: (typeof beans)[number]) =>
		filterBatchId
			? b.batchId === filterBatchId
			: b.id.toString() === filterBeanId

	const colorFor = useMemo(() => {
		const map = new Map(beans.map((b) => [b.id, beanColor(b)]))
		return (beanId: number) =>
			map.get(beanId) ?? getBatchColor(`fallback-${beanId}`)
	}, [beans])

	const groups = useMemo(() => {
		const out: { day: string; rows: BrewWithRelations[] }[] = []
		for (const brew of brews) {
			const label = dayLabel(new Date(brew.createdAt))
			const last = out.at(-1)
			if (last && last.day === label) last.rows.push(brew)
			else out.push({ day: label, rows: [brew] })
		}
		return out
	}, [brews])

	useEffect(() => {
		if (!brews || brews.length === 0) return

		const lastVisit = localStorage.getItem('lastBrewsVisit')
		const now = new Date().toISOString()

		if (lastVisit) {
			const newAutoBrews = brews.filter(
				(b) => b.autoCreated && new Date(b.createdAt) > new Date(lastVisit),
			)

			if (newAutoBrews.length > 0) {
				toast.success(
					`${newAutoBrews.length} brew${newAutoBrews.length > 1 ? 's' : ''} logged automatically`,
				)
			}
		}

		localStorage.setItem('lastBrewsVisit', now)
	}, [brews])

	useEffect(() => {
		const el = sentinelRef.current
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
					loadMore()
				}
			},
			{ threshold: 0.1 },
		)

		if (el) observer.observe(el)
		return () => {
			if (el) observer.unobserve(el)
		}
	}, [hasMore, isLoadingMore, loadMore])

	const handleAddBrew = () => {
		setSelectedBrew(undefined)
		setCloneData(undefined)
		setIsFormOpen(true)
	}

	const handleEditBrew = (id: number) => {
		setOpenDropdownId(null)
		setSelectedBrew(id)
		setCloneData(undefined)
		setIsFormOpen(true)
	}

	const handleCloneBrew = (brew: BrewWithRelations) => {
		setOpenDropdownId(null)

		const initialData: Partial<BrewFormData> = {
			beanId: brew.beanId,
			method: brew.method,
			doseWeight: brew.doseWeight,
			yieldWeight: brew.yieldWeight ?? undefined,
			brewTime: brew.brewTime ?? 0,
			grindSize: brew.grindSize ?? 0,
			waterTemperature: brew.waterTemperature ?? undefined,
			rating: brew.rating ?? 0,
			notes: brew.notes ?? '',
			brewerId: brew.brewerId ?? undefined,
			grinderId: brew.grinderId ?? undefined,
		}

		setSelectedBrew(undefined)
		setCloneData(initialData)
		setIsFormOpen(true)
	}

	const handleDeleteBrew = async (id: number) => {
		try {
			await axios.delete(`/api/brews/${id}`)

			refresh()
			toast.success('Brew deleted successfully')
		} catch (error) {
			console.error('Error deleting brew:', error)
			toast.error('Failed to delete brew')
		} finally {
			setDeleteModal({ ...deleteModal, isOpen: false })
		}
	}

	const confirmDeleteBrew = (id: number, name: string) => {
		setOpenDropdownId(null)
		setDeleteModal({
			isOpen: true,
			brewId: id,
			brewName: name,
		})
	}

	return (
		<Page title='Shots'>
			<PageHeader
				title='Shots'
				actions={
					<>
						<IconButton
							pressed={showFilters}
							onClick={() => setShowFilters(!showFilters)}
							aria-label={showFilters ? 'Hide filters' : 'Show filters'}
							className='relative'
						>
							<SlidersIcon size={20} />
							{hasActiveFilters && !showFilters && (
								<span className='absolute top-2 right-2 size-[7px] rounded-full bg-accent' />
							)}
						</IconButton>
						<AddKey onClick={handleAddBrew} aria-label='Log a brew' />
					</>
				}
			/>

			<AnimatePresence initial={false}>
				{showFilters && (
					<motion.div
						key='filters'
						ref={filtersRef}
						{...collapse}
						className='overflow-hidden'
					>
						<div className='pt-1 pb-3'>
							<div
								role='group'
								aria-label='Filter by bean'
								className='no-scrollbar flex scroll-px-5 gap-2 overflow-x-auto px-5 py-0.5 after:w-3 after:shrink-0'
							>
								<Chip
									on={!filterBeanId && !filterBatchId}
									onClick={() => updateFilters({}, filterMethod)}
								>
									All
								</Chip>
								{beanChips.map((b) => (
									<Chip
										key={b.id}
										on={isChipOn(b)}
										onClick={() =>
											updateFilters(
												isChipOn(b)
													? {}
													: b.batchId
														? { batchId: b.batchId }
														: { beanId: b.id.toString() },
												filterMethod,
											)
										}
									>
										{b.name}
									</Chip>
								))}
							</div>
							<div
								role='group'
								aria-label='Filter by method'
								className='no-scrollbar mt-2 flex scroll-px-5 gap-2 overflow-x-auto px-5 py-0.5 after:w-3 after:shrink-0'
							>
								<Chip
									size='sm'
									on={!filterMethod}
									onClick={() => updateFilters(currentBeanFilter, '')}
								>
									All
								</Chip>
								{BREW_METHODS.map((m) => (
									<Chip
										key={m}
										size='sm'
										on={filterMethod === m}
										onClick={() =>
											updateFilters(
												currentBeanFilter,
												filterMethod === m ? '' : m,
											)
										}
									>
										{m}
									</Chip>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className='px-5'>
				{isLoading ? (
					<div className='pt-4'>
						<RowSkeleton rows={5} />
					</div>
				) : brews.length === 0 ? (
					<EmptyState
						className='mt-4'
						title={hasActiveFilters ? 'No matching shots' : 'No shots yet'}
						body={
							hasActiveFilters
								? 'Nothing logged with these filters. Try another bean or method.'
								: 'Pick a recipe on the Brew screen and your shot is logged after it finishes, or log one here.'
						}
						action={
							hasActiveFilters ? (
								<TextButton
									underline
									onClick={() => updateFilters({}, '')}
									className='-ml-1'
								>
									Clear filters
								</TextButton>
							) : (
								<TextButton
									tone='accent'
									onClick={handleAddBrew}
									className='-ml-1'
								>
									Log a shot
								</TextButton>
							)
						}
					/>
				) : (
					<>
						{groups.map((g) => (
							<section key={g.day}>
								<h2 className='flex h-11 items-end pb-2 text-[13px] font-semibold text-ink-2'>
									{g.day}
								</h2>
								{g.rows.map((brew, i) => (
									<FadeIn key={brew.id} y={10} duration={0.5}>
										<ShotRow
											brew={brew}
											first={i === 0}
											color={colorFor(brew.beanId)}
											menuOpen={openDropdownId === brew.id}
											onMenuOpenChange={(open) =>
												setOpenDropdownId(open ? brew.id : null)
											}
											onEdit={() => handleEditBrew(brew.id)}
											onClone={() => handleCloneBrew(brew)}
											onDelete={() =>
												confirmDeleteBrew(brew.id, brew.bean.name)
											}
										/>
									</FadeIn>
								))}
							</section>
						))}

						<div ref={sentinelRef} className='h-4' />

						{isLoadingMore && <RowSkeleton rows={2} />}
					</>
				)}
			</div>

			<BrewForm
				isOpen={isFormOpen}
				onClose={() => {
					setIsFormOpen(false)
					setCloneData(undefined)
				}}
				brewId={selectedBrew}
				onSuccess={refresh}
				initialData={cloneData}
			/>

			<ConfirmModal
				open={deleteModal.isOpen}
				onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
				onConfirm={() => handleDeleteBrew(deleteModal.brewId)}
				title='Delete shot?'
				description={`This shot of ${deleteModal.brewName} will be removed. This can't be undone.`}
				confirmLabel='Delete'
			/>
		</Page>
	)
}

interface ShotRowProps {
	brew: BrewWithRelations
	first: boolean
	color: string
	menuOpen: boolean
	onMenuOpenChange: (open: boolean) => void
	onEdit: () => void
	onClone: () => void
	onDelete: () => void
}

function ShotRow({
	brew,
	first,
	color,
	menuOpen,
	onMenuOpenChange,
	onEdit,
	onClone,
	onDelete,
}: ShotRowProps) {
	const recipe = brew.yieldWeight
		? `${fmt1(brew.doseWeight)} → ${fmt1(brew.yieldWeight)} g`
		: `${fmt1(brew.doseWeight)} g`
	const extra = [
		brew.method !== 'Espresso' ? brew.method : null,
		brew.grindSize ? `Grind ${fmt1(brew.grindSize)}` : null,
		brew.waterTemperature ? `${brew.waterTemperature}°C` : null,
	]
		.filter(Boolean)
		.join(' · ')
	const duration = formatDuration(brew.brewTime)
	const rating = brew.rating ?? 0

	return (
		<div
			className={cn(
				'relative flex min-h-[84px] items-center',
				!first && 'border-t border-line',
			)}
		>
			<button
				type='button'
				onClick={onEdit}
				aria-label={`Edit ${brew.bean.name} shot`}
				className='flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-xl text-left outline-offset-[-2px]'
			>
				<div className='flex min-w-0 flex-1 flex-col gap-[3px] py-2.5'>
					<div className='flex min-w-0 items-center gap-2'>
						<Swatch color={color} />
						<span className='truncate text-[16px] font-semibold'>
							{brew.bean.name}
						</span>
						{brew.autoCreated && (
							<span className='inline-flex shrink-0 items-center gap-[3px] text-[12px] font-medium text-ink-2'>
								<BoltIcon />
								Auto
							</span>
						)}
					</div>
					<span className='font-mono text-[11.5px] tracking-[0.02em] whitespace-nowrap text-ink-2'>
						{recipe} · {format(new Date(brew.createdAt), 'HH:mm')}
					</span>
					{extra && (
						<span className='truncate font-mono text-[11.5px] tracking-[0.02em] text-ink-2'>
							{extra}
						</span>
					)}
					{brew.notes && (
						<span className='truncate text-[13px] text-ink-2'>
							{brew.notes}
						</span>
					)}
				</div>
				<div className='flex min-w-16 shrink-0 flex-col items-end gap-1.5 whitespace-nowrap'>
					{duration && (
						<span className='font-mono text-[18px] font-medium'>
							{duration}
						</span>
					)}
					{rating > 0 && (
						<span
							className='flex gap-px text-star'
							aria-label={`${rating} of 5 stars`}
						>
							{[1, 2, 3, 4, 5].map((n) => (
								<StarIcon
									key={n}
									size={10}
									strokeWidth={2}
									filled={n <= rating}
									className={n <= rating ? '' : 'text-line'}
								/>
							))}
						</span>
					)}
				</div>
			</button>
			<RowMenu
				label={`Actions for ${brew.bean.name} shot`}
				open={menuOpen}
				onOpenChange={onMenuOpenChange}
				width={172}
				items={[
					{ label: 'Edit', icon: <EditIcon />, onSelect: onEdit },
					{ label: 'Clone', icon: <CloneIcon />, onSelect: onClone },
					{
						label: 'Delete',
						icon: <TrashIcon />,
						onSelect: onDelete,
						danger: true,
					},
				]}
			/>
		</div>
	)
}
