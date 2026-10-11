import Page, { PageHeader } from '@/components/Page'
import { useState, useEffect } from 'react'
import axios from 'axios'
import type { Brewer, Grinder } from 'generated/prisma/client'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ConfirmModal'
import BrewerFormModal from '@/components/BrewerFormModal'
import GrinderFormModal from '@/components/GrinderFormModal'

import { AddKey, TextButton } from '@/components/kit/buttons'
import { RowMenu } from '@/components/kit/RowMenu'
import { SegTabs } from '@/components/kit/rows'
import { EmptyState, RowSkeleton } from '@/components/kit/states'
import { EditIcon, TrashIcon } from '@/components/kit/icons'

type Seg = 'brewers' | 'grinders'

export default function EquipmentPage() {
	const [brewers, setBrewers] = useState<Brewer[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [seg, setSeg] = useState<Seg>('brewers')

	const [isBrewerModalOpen, setIsBrewerModalOpen] = useState(false)
	const [isGrinderModalOpen, setIsGrinderModalOpen] = useState(false)
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined)

	const [deleteData, setDeleteData] = useState<{
		type: 'brewer' | 'grinder'
		id: number
		name: string
	} | null>(null)

	useEffect(() => {
		void fetchData()
	}, [])

	const fetchData = async () => {
		setIsLoading(true)
		try {
			const [bRes, gRes] = await Promise.all([
				axios.get('/api/brewers'),
				axios.get('/api/grinders'),
			])
			setBrewers(bRes.data)
			setGrinders(gRes.data)
		} catch (error) {
			toast.error('Failed to load equipment')
		} finally {
			setIsLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!deleteData) return
		try {
			const endpoint = deleteData.type === 'brewer' ? 'brewers' : 'grinders'
			await axios.delete(`/api/${endpoint}/${deleteData.id}`)
			toast.success(
				`${deleteData.type === 'brewer' ? 'Brewer' : 'Grinder'} deleted`,
			)
			fetchData()
		} catch (error) {
			toast.error('Failed to delete item')
		} finally {
			setDeleteData(null)
		}
	}

	const openAdd = () => {
		setSelectedId(undefined)
		if (seg === 'brewers') setIsBrewerModalOpen(true)
		else setIsGrinderModalOpen(true)
	}

	const openEdit = (type: 'brewer' | 'grinder', id: number) => {
		setSelectedId(id)
		if (type === 'brewer') setIsBrewerModalOpen(true)
		else setIsGrinderModalOpen(true)
	}

	const items =
		seg === 'brewers'
			? brewers.map((b) => ({
					type: 'brewer' as const,
					id: b.id,
					name: b.name,
					sub: b.type,
				}))
			: grinders.map((g) => ({
					type: 'grinder' as const,
					id: g.id,
					name: g.name,
					sub: g.burrType,
				}))

	return (
		<Page title='Gear'>
			<PageHeader
				title='Gear'
				actions={
					<AddKey
						onClick={openAdd}
						aria-label={seg === 'brewers' ? 'Add a brewer' : 'Add a grinder'}
					/>
				}
			/>

			<div className='px-5 pt-1'>
				<SegTabs
					value={seg}
					onChange={setSeg}
					options={[
						{ value: 'brewers', label: 'Brewers' },
						{ value: 'grinders', label: 'Grinders' },
					]}
				/>
			</div>

			<div className='px-5 pt-1'>
				{isLoading ? (
					<RowSkeleton rows={3} variant='simple' />
				) : items.length === 0 ? (
					<EmptyState
						className='mt-3 border-t-0'
						title={seg === 'brewers' ? 'No brewers yet' : 'No grinders yet'}
						body={
							seg === 'brewers'
								? 'Add your machine or brewer so shots can record what they were made on.'
								: 'Add a grinder so grind settings stay tied to the right burrs.'
						}
						action={
							<TextButton tone='accent' onClick={openAdd} className='-ml-1'>
								{seg === 'brewers' ? 'Add a brewer' : 'Add a grinder'}
							</TextButton>
						}
					/>
				) : (
					items.map((it, i) => (
						<div
							key={`${it.type}-${it.id}`}
							className={
								i > 0
									? 'flex items-start border-t border-line'
									: 'flex items-start'
							}
						>
							<button
								type='button'
								onClick={() => openEdit(it.type, it.id)}
								className='min-w-0 flex-1 py-3.5 text-left outline-offset-[-2px]'
							>
								<div className='truncate text-[17px] font-semibold'>
									{it.name}
								</div>
								{it.sub && (
									<div className='mt-0.5 text-[13.5px] leading-[18px] text-ink-2'>
										{it.sub}
									</div>
								)}
							</button>
							<RowMenu
								className='mt-2.5'
								label={`Actions for ${it.name}`}
								width={172}
								items={[
									{
										label: 'Edit',
										icon: <EditIcon />,
										onSelect: () => openEdit(it.type, it.id),
									},
									{
										label: 'Delete',
										icon: <TrashIcon />,
										danger: true,
										onSelect: () =>
											setDeleteData({
												type: it.type,
												id: it.id,
												name: it.name,
											}),
									},
								]}
							/>
						</div>
					))
				)}
			</div>

			<BrewerFormModal
				isOpen={isBrewerModalOpen}
				onClose={() => setIsBrewerModalOpen(false)}
				brewerId={selectedId}
				onSuccess={fetchData}
			/>

			<GrinderFormModal
				isOpen={isGrinderModalOpen}
				onClose={() => setIsGrinderModalOpen(false)}
				grinderId={selectedId}
				onSuccess={fetchData}
			/>

			<ConfirmModal
				open={!!deleteData}
				onClose={() => setDeleteData(null)}
				onConfirm={handleDelete}
				title={`Delete ${deleteData?.type ?? 'item'}?`}
				description={`"${deleteData?.name}" will be removed. This can't be undone.`}
				confirmLabel='Delete'
			/>
		</Page>
	)
}
