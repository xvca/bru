import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import type { Brewer, Grinder } from 'generated/prisma/client'
import { Plus, Settings, Coffee, Edit, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ConfirmModal'
import BrewerFormModal from '@/components/BrewerFormModal'
import GrinderFormModal from '@/components/GrinderFormModal'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

export default function EquipmentPage() {
	const { user } = useAuth()
	const { activeBarId, availableBars } = useBrewBar()

	const [brewers, setBrewers] = useState<Brewer[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const [isBrewerModalOpen, setIsBrewerModalOpen] = useState(false)
	const [isGrinderModalOpen, setIsGrinderModalOpen] = useState(false)
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined)

	const [deleteData, setDeleteData] = useState<{
		type: 'brewer' | 'grinder'
		id: number
		name: string
	} | null>(null)

	const currentBarName = activeBarId
		? availableBars.find((b) => b.id === activeBarId)?.name
		: 'Personal Space'

	useEffect(() => {
		if (user) fetchData()
	}, [user, activeBarId])

	const fetchData = async () => {
		setIsLoading(true)
		try {
			const params = { barId: activeBarId }
			const headers = { Authorization: `Bearer ${user?.token}` }
			const [bRes, gRes] = await Promise.all([
				axios.get('/api/brewers', { headers, params }),
				axios.get('/api/grinders', { headers, params }),
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
			await axios.delete(`/api/${endpoint}/${deleteData.id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
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

	return (
		<ProtectedPage title='Equipment'>
			<div className='p-6'>
				<div className='flex justify-between items-center mb-8'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Equipment</h1>
						<p className='text-muted-foreground mt-1'>
							Manage gear for:{' '}
							<span className='font-medium text-foreground'>
								{currentBarName}
							</span>
						</p>
					</div>
				</div>

				<Tabs defaultValue='brewers' className='w-full'>
					<TabsList className='mb-4 w-full'>
						<TabsTrigger value='brewers' className='grow'>
							Brewers
						</TabsTrigger>
						<TabsTrigger value='grinders' className='grow'>
							Grinders
						</TabsTrigger>
					</TabsList>

					<TabsContent value='brewers'>
						<div className='flex justify-end mb-4'>
							<Button
								onClick={() => {
									setSelectedId(undefined)
									setIsBrewerModalOpen(true)
								}}
							>
								<Plus className='mr-2 h-4 w-4' /> Add Brewer
							</Button>
						</div>
						{isLoading ? (
							<Skeleton className='h-24 w-full' />
						) : (
							<div className='grid gap-4 md:grid-cols-2'>
								{brewers.map((item) => (
									<Card key={item.id}>
										<CardHeader className='flex flex-row items-start justify-between space-y-0'>
											<div>
												<CardTitle className='text-base'>{item.name}</CardTitle>
												<CardDescription>{item.type}</CardDescription>
											</div>
											<div className='flex gap-1'>
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8'
													onClick={() => {
														setSelectedId(item.id)
														setIsBrewerModalOpen(true)
													}}
												>
													<Edit className='h-4 w-4' />
												</Button>
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-destructive'
													onClick={() =>
														setDeleteData({
															type: 'brewer',
															id: item.id,
															name: item.name,
														})
													}
												>
													<Trash className='h-4 w-4' />
												</Button>
											</div>
										</CardHeader>
									</Card>
								))}
								{brewers.length === 0 && (
									<div className='text-center text-muted-foreground py-8 col-span-2'>
										No brewers found
									</div>
								)}
							</div>
						)}
					</TabsContent>

					<TabsContent value='grinders'>
						<div className='flex justify-end mb-4'>
							<Button
								onClick={() => {
									setSelectedId(undefined)
									setIsGrinderModalOpen(true)
								}}
							>
								<Plus className='mr-2 h-4 w-4' /> Add Grinder
							</Button>
						</div>
						{isLoading ? (
							<Skeleton className='h-24 w-full' />
						) : (
							<div className='grid gap-4 md:grid-cols-2'>
								{grinders.map((item) => (
									<Card key={item.id}>
										<CardHeader className='flex flex-row items-start justify-between space-y-0'>
											<div>
												<CardTitle className='text-base'>{item.name}</CardTitle>
												<CardDescription>{item.burrType}</CardDescription>
											</div>
											<div className='flex gap-1'>
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8'
													onClick={() => {
														setSelectedId(item.id)
														setIsGrinderModalOpen(true)
													}}
												>
													<Edit className='h-4 w-4' />
												</Button>
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-destructive'
													onClick={() =>
														setDeleteData({
															type: 'grinder',
															id: item.id,
															name: item.name,
														})
													}
												>
													<Trash className='h-4 w-4' />
												</Button>
											</div>
										</CardHeader>
									</Card>
								))}
								{grinders.length === 0 && (
									<div className='text-center text-muted-foreground py-8 col-span-2'>
										No grinders found
									</div>
								)}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>

			<BrewerFormModal
				isOpen={isBrewerModalOpen}
				onClose={() => setIsBrewerModalOpen(false)}
				brewBarId={activeBarId}
				brewerId={selectedId}
				onSuccess={fetchData}
			/>

			<GrinderFormModal
				isOpen={isGrinderModalOpen}
				onClose={() => setIsGrinderModalOpen(false)}
				brewBarId={activeBarId || null}
				grinderId={selectedId}
				onSuccess={fetchData}
			/>

			<ConfirmModal
				open={!!deleteData}
				onClose={() => setDeleteData(null)}
				onConfirm={handleDelete}
				title={`Delete ${deleteData?.type === 'brewer' ? 'Brewer' : 'Grinder'}`}
				description={`Are you sure you want to delete "${deleteData?.name}"?`}
			/>
		</ProtectedPage>
	)
}
