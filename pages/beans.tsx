import Page, { PageHeader } from '@/components/Page'
import { AnimatePresence, motion } from 'framer-motion'
import { FadeIn, collapse } from '@/components/kit/FadeIn'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useBeans } from '@/hooks/useBeans'
import { toast } from 'sonner'
import type { Bean } from '@/generated/prisma/client'
import { ConfirmModal } from '@/components/ConfirmModal'
import BeanFormModal from '@/components/BeanFormModal'
import ThawBeanModal from '@/components/ThawBeanModal'
import BrewFormModal from '@/components/BrewFormModal'
import { cn } from '@/lib/utils'
import { beanColor } from '@/lib/beanColor'

import { AddKey, TextButton } from '@/components/kit/buttons'
import { RowMenu } from '@/components/kit/RowMenu'
import { Swatch } from '@/components/kit/rows'
import { EmptyState, RowSkeleton } from '@/components/kit/states'
import {
	CupIcon,
	DoneIcon,
	EditIcon,
	ListIcon,
	SnowIcon,
	TrashIcon,
} from '@/components/kit/icons'

export default function BeansPage() {
	const router = useRouter()
	const { beans, isLoading, refresh } = useBeans()

	const [modalData, setModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
	})

	const [thawModalData, setThawModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
		remainingWeight: 0,
	})

	const [emptyModalData, setEmptyModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
	})

	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>(
		undefined,
	)
	const [showFinished, setShowFinished] = useState(false)
	const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
	const [isBrewFormOpen, setIsBrewFormOpen] = useState(false)
	const [selectedBeanForBrew, setSelectedBeanForBrew] = useState<
		number | undefined
	>(undefined)

	const handleAddNew = () => {
		setSelectedBeanId(undefined)
		setIsFormOpen(true)
	}

	const handleEdit = (id: number) => {
		setOpenDropdownId(null)
		setSelectedBeanId(id)
		setIsFormOpen(true)
	}

	const handleThaw = (id: number, name: string, weight: number) => {
		setThawModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
			remainingWeight: weight,
		})
	}

	const handleCreateBrew = (beanId: number) => {
		setOpenDropdownId(null)
		setSelectedBeanForBrew(beanId)
		setIsBrewFormOpen(true)
	}

	const handleViewBrews = (beanId: number) => {
		const bean = beans?.find((b) => b.id === beanId)
		if (!bean) return

		router.push({
			pathname: '/brews',
			query: { batchId: bean.batchId || '' },
		})
	}

	const handleDelete = async (id: number) => {
		try {
			await axios.delete(`/api/beans/${id}`)

			toast.success('Bean deleted successfully')
			refresh()
			setModalData({ ...modalData, isOpen: false })
		} catch (error) {
			console.error('Error deleting bean:', error)
			if (axios.isAxiosError(error) && error.response?.status === 409) {
				toast.error('Cannot delete a bean that is used in brews')
			} else {
				toast.error('Failed to delete bean')
			}
		}
	}

	const confirmDelete = (id: number, name: string) => {
		setOpenDropdownId(null)
		setModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
		})
	}

	const confirmMarkEmpty = (id: number, name: string) => {
		setOpenDropdownId(null)
		setEmptyModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
		})
	}

	const handleMarkEmpty = async (id: number) => {
		try {
			await axios.post(`/api/beans/${id}/empty`)
			toast.success('Marked finished')
			refresh()
		} catch (error) {
			console.error('Error marking bag as empty:', error)
			toast.error('Could not mark finished')
		}
	}

	const calculateDaysSinceRoast = (
		roastDateStr: Date | string,
		freezeDateStr?: Date | string | null,
		thawDateStr?: Date | string | null,
	): number => {
		const roast = new Date(roastDateStr)
		const now = new Date()

		if (freezeDateStr) {
			const freeze = new Date(freezeDateStr)
			const ageBeforeFreeze = freeze.getTime() - roast.getTime()

			if (thawDateStr) {
				const thaw = new Date(thawDateStr)
				const ageAfterThaw = now.getTime() - thaw.getTime()
				const totalAge = ageBeforeFreeze + ageAfterThaw
				return Math.max(0, Math.floor(totalAge / (1000 * 60 * 60 * 24)))
			} else {
				return Math.max(0, Math.floor(ageBeforeFreeze / (1000 * 60 * 60 * 24)))
			}
		}

		const diffTime = now.getTime() - roast.getTime()
		return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
	}

	const sortedBeans = useMemo(() => {
		if (!beans) return []

		const batches: Record<string, typeof beans> = {}
		beans.forEach((bean) => {
			const batchId = bean.batchId || `fallback-${bean.id}`
			if (!batches[batchId]) batches[batchId] = []
			batches[batchId].push(bean)
		})

		const getBeanScore = (bean: (typeof beans)[0]) => {
			if (bean.remainingWeight === 0) return 1
			const isFrozen = !!bean.freezeDate && !bean.thawDate
			if (isFrozen) return 2
			return 3
		}

		const sortedBatchIds = Object.keys(batches).sort((a, b) => {
			const batchA = batches[a]
			const batchB = batches[b]

			const scoreA = Math.max(...batchA.map(getBeanScore))
			const scoreB = Math.max(...batchB.map(getBeanScore))

			if (scoreA !== scoreB) return scoreB - scoreA

			const dateA = new Date(batchA[0].roastDate).getTime()
			const dateB = new Date(batchB[0].roastDate).getTime()
			if (dateA !== dateB) return dateA - dateB

			return batchA[0].name.localeCompare(batchB[0].name)
		})

		return sortedBatchIds.flatMap((batchId) => {
			const batchBeans = batches[batchId]
			return batchBeans.sort((a, b) => {
				const scoreA = getBeanScore(a)
				const scoreB = getBeanScore(b)
				if (scoreA !== scoreB) return scoreB - scoreA
				return b.id - a.id
			})
		})
	}, [beans])

	const activeBeans = sortedBeans.filter((b) => b.remainingWeight !== 0)
	const finishedBeans = sortedBeans
		.filter((b) => b.remainingWeight === 0)
		.sort((a, b) => {
			const dateDifference =
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			return dateDifference || b.id - a.id
		})

	const renderBeanRow = (bean: Bean, index: number) => {
		const isThawed = !!bean.freezeDate && !!bean.thawDate
		const isFrozen = !!bean.freezeDate && !bean.thawDate
		const isFinished = bean.remainingWeight === 0

		const daysOld = calculateDaysSinceRoast(
			bean.roastDate,
			bean.freezeDate,
			bean.thawDate,
		)

		const pct =
			bean.remainingWeight !== null && bean.initialWeight > 0
				? Math.min(100, (bean.remainingWeight / bean.initialWeight) * 100)
				: null

		const detail = [
			isFrozen ? 'Frozen' : isThawed ? 'Thawed' : null,
			daysOld === 0
				? 'Roasted today'
				: `${daysOld} day${daysOld === 1 ? '' : 's'} off roast`,
			bean.roastLevel,
		]
			.filter(Boolean)
			.join(' · ')

		return (
			<FadeIn key={bean.id}>
				<div
					className={cn(
						'relative flex items-start',
						index > 0 && 'border-t border-line',
						isFinished && 'opacity-60',
					)}
				>
					<div className='min-w-0 flex-1 py-4'>
						<div className='flex items-center gap-[9px]'>
							<Swatch color={beanColor(bean)} />
							<span className='truncate text-[17px] font-semibold'>
								{bean.name}
							</span>
						</div>
						{bean.roaster && (
							<div className='mt-0.5 ml-[19px] truncate text-[13.5px] leading-[18px] text-ink-2'>
								{bean.roaster}
							</div>
						)}
						<div className='mt-px ml-[19px] text-[13.5px] leading-[18px] text-ink-2'>
							{detail}
						</div>
						{isFrozen && (
							<TextButton
								tone='accent'
								onClick={() =>
									handleThaw(bean.id, bean.name, bean.remainingWeight || 0)
								}
								className='mt-1.5 ml-[15px] min-h-8'
							>
								<SnowIcon />
								Thaw
							</TextButton>
						)}
						{pct !== null && (
							<div
								className='relative mt-3 ml-[19px] h-[3px] rounded-[2px] bg-line'
								role='progressbar'
								aria-label={`${bean.remainingWeight} of ${bean.initialWeight} grams left`}
								aria-valuenow={Math.round(pct)}
								aria-valuemin={0}
								aria-valuemax={100}
							>
								<div
									className={cn(
										'absolute inset-y-0 left-0 rounded-[2px]',
										isFrozen ? 'bg-ink-2' : 'bg-ink',
									)}
									style={{ width: `${pct}%` }}
								/>
							</div>
						)}
					</div>
					<div className='w-[76px] shrink-0 pt-4 pl-3 text-right whitespace-nowrap'>
						<div className='font-mono text-[20px] leading-6 font-medium'>
							{bean.remainingWeight ?? bean.initialWeight}
							<span className='text-[12px] text-ink-2'> g</span>
						</div>
						{bean.remainingWeight !== null && (
							<div className='text-[12px] text-ink-2'>
								of {bean.initialWeight} g
							</div>
						)}
					</div>
					<RowMenu
						className='mt-2.5'
						label={`Actions for ${bean.name}`}
						open={openDropdownId === bean.id}
						onOpenChange={(open) => setOpenDropdownId(open ? bean.id : null)}
						items={[
							{
								label: 'Brew',
								icon: <CupIcon />,
								onSelect: () => handleCreateBrew(bean.id),
							},
							{
								label: 'View shots',
								icon: <ListIcon size={16} strokeWidth={1.9} />,
								onSelect: () => handleViewBrews(bean.id),
							},
							{
								label: 'Edit',
								icon: <EditIcon />,
								onSelect: () => handleEdit(bean.id),
							},
							{
								label: 'Mark finished',
								icon: <DoneIcon />,
								onSelect: () => confirmMarkEmpty(bean.id, bean.name),
								hidden: isFinished,
							},
							{
								label: 'Delete',
								icon: <TrashIcon />,
								onSelect: () => confirmDelete(bean.id, bean.name),
								danger: true,
							},
						]}
					/>
				</div>
			</FadeIn>
		)
	}

	return (
		<Page title='Beans'>
			<PageHeader
				title='Beans'
				actions={<AddKey onClick={handleAddNew} aria-label='Add a bean' />}
			/>

			<div className='px-5 pt-2'>
				{isLoading ? (
					<RowSkeleton rows={4} variant='bean' />
				) : beans.length === 0 ? (
					<EmptyState
						className='mt-2'
						title='No beans yet'
						body='Add your first bag to track what is left, days off roast and which shots you pulled with it.'
						action={
							<TextButton
								tone='accent'
								onClick={handleAddNew}
								className='-ml-1'
							>
								Add a bean
							</TextButton>
						}
					/>
				) : (
					<>
						{activeBeans.length === 0 && (
							<EmptyState
								title='Nothing open'
								body='Every bag is finished. Add a new one to keep logging.'
							/>
						)}
						{activeBeans.map((bean, index) => renderBeanRow(bean, index))}

						<AnimatePresence initial={false}>
							{showFinished && (
								<motion.div
									key='finished'
									{...collapse}
									className='overflow-hidden'
								>
									{finishedBeans.map((bean, index) =>
										renderBeanRow(bean, activeBeans.length + index),
									)}
								</motion.div>
							)}
						</AnimatePresence>
						{finishedBeans.length > 0 && (
							<TextButton
								tone='ink2'
								onClick={() => setShowFinished(!showFinished)}
								aria-expanded={showFinished}
								className='mt-2 -ml-1'
							>
								{showFinished ? 'Hide finished' : 'Show finished'} (
								{finishedBeans.length})
							</TextButton>
						)}
					</>
				)}
			</div>

			<BeanFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				beanId={selectedBeanId}
				onSuccess={refresh}
			/>

			<ThawBeanModal
				isOpen={thawModalData.isOpen}
				onClose={() => setThawModalData({ ...thawModalData, isOpen: false })}
				beanId={thawModalData.beanId}
				beanName={thawModalData.beanName}
				remainingWeight={thawModalData.remainingWeight}
				onSuccess={refresh}
			/>

			<ConfirmModal
				open={modalData.isOpen}
				onClose={() => setModalData({ ...modalData, isOpen: false })}
				onConfirm={() => handleDelete(modalData.beanId)}
				title='Delete bean?'
				description={`"${modalData.beanName}" will be removed. This can't be undone.`}
				confirmLabel='Delete'
			/>

			<ConfirmModal
				open={emptyModalData.isOpen}
				onClose={() => setEmptyModalData({ ...emptyModalData, isOpen: false })}
				onConfirm={() => handleMarkEmpty(emptyModalData.beanId)}
				title='Mark finished?'
				description={`"${emptyModalData.beanName}" will move to Finished with 0g remaining.`}
				confirmLabel='Mark finished'
			/>

			<BrewFormModal
				isOpen={isBrewFormOpen}
				onClose={() => {
					setIsBrewFormOpen(false)
					setSelectedBeanForBrew(undefined)
				}}
				onSuccess={refresh}
				initialData={
					selectedBeanForBrew ? { beanId: selectedBeanForBrew } : undefined
				}
			/>
		</Page>
	)
}
