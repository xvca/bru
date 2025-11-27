import React, { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
	Plus,
	Users,
	Coffee,
	Settings,
	Edit,
	Trash,
	UserPlus,
} from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import BrewBarFormModal from '@/components/BrewBarFormModal'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// Types
type BrewBar = {
	id: number
	name: string
	location: string | null
	createdAt: string
	isOwner: boolean
	memberCount: number
	role: string
}

export default function BrewBarsPage() {
	const { user } = useAuth()
	const router = useRouter()
	const [brewBars, setBrewBars] = useState<BrewBar[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [selectedBar, setSelectedBar] = useState<number | null>(null)
	const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
	const [barToDelete, setBarToDelete] = useState<{
		id: number
		name: string
	} | null>(null)

	// Fetch brew bars when component mounts
	useEffect(() => {
		if (user) {
			fetchBrewBars()
		}
	}, [user])

	const fetchBrewBars = async () => {
		try {
			setIsLoading(true)
			const { data } = await axios.get('/api/brew-bars', {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setBrewBars(data)
		} catch (error) {
			console.error('Error fetching brew bars:', error)
			toast.error('Failed to load brew bars')
		} finally {
			setIsLoading(false)
		}
	}

	const handleCreateNewBar = () => {
		setSelectedBar(null)
		setIsCreateModalOpen(true)
	}

	const handleEditBar = (id: number) => {
		setSelectedBar(id)
		setIsCreateModalOpen(true)
	}

	const confirmDelete = (id: number, name: string) => {
		setBarToDelete({ id, name })
		setIsConfirmDeleteOpen(true)
	}

	const handleDelete = async () => {
		if (!barToDelete) return

		try {
			await axios.delete(`/api/brew-bars/${barToDelete.id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBrewBars(brewBars.filter((bar) => bar.id !== barToDelete.id))
			toast.success('Brew bar deleted successfully')
		} catch (error) {
			console.error('Error deleting brew bar:', error)
			if (axios.isAxiosError(error) && error.response?.status === 403) {
				toast.error('You do not have permission to delete this brew bar')
			} else {
				toast.error('Failed to delete brew bar')
			}
		} finally {
			setIsConfirmDeleteOpen(false)
			setBarToDelete(null)
		}
	}

	const navigateToMembers = (barId: number) => {
		router.push(`/brew-bars/${barId}?tab=members`)
	}

	const navigateToEquipment = (barId: number) => {
		router.push(`/brew-bars/${barId}?tab=equipment`)
	}

	return (
		<ProtectedPage title='Brew Bars'>
			<Toaster position='top-center' />
			<Section>
				<div className='flex justify-between items-center mb-6'>
					<h1 className='text-2xl font-bold'>Brew Bars</h1>
					<Button onClick={handleCreateNewBar}>
						<Plus size={18} />
						<span>New Brew Bar</span>
					</Button>
				</div>

				{isLoading ? (
					<div className='flex justify-center items-center h-40'>
						<Spinner />
					</div>
				) : brewBars.length === 0 ? (
					<div className='text-center py-12 space-y-4 border border-dashed border-border rounded-lg'>
						<Users size={48} className='mx-auto opacity-30' />
						<p>No brew bars created yet</p>
						<Button onClick={handleCreateNewBar} variant='link'>
							Create your first brew bar
						</Button>
					</div>
				) : (
					<div className='space-y-4'>
						{brewBars.map((bar) => (
							<div key={bar.id} className='border border-border rounded-lg p-4'>
								<div className='flex justify-between'>
									<div>
										<h3 className='text-lg font-medium'>{bar.name}</h3>

										{bar.location && (
											<p className='text-sm text-text-secondary'>
												{bar.location}
											</p>
										)}

										<div className='mt-1 flex items-center gap-2 text-sm text-text-secondary'>
											<Users size={16} />
											<span>
												{bar.memberCount}{' '}
												{bar.memberCount === 1 ? 'Member' : 'Members'}
											</span>

											{bar.isOwner && (
												<span className='text-primary'>Owner</span>
											)}

											{!bar.isOwner && bar.role && (
												<span className='bg-text-secondary text-white text-xs px-2 py-0.5 rounded-full'>
													{bar.role}
												</span>
											)}
										</div>
									</div>

									<div className='flex gap-2'>
										<Button
											onClick={() => {
												navigateToMembers(bar.id)
											}}
											title='Manage Members'
											variant='ghost'
											size='icon'
											className='rounded-full'
										>
											<UserPlus size={16} />
										</Button>

										<Button
											onClick={() => {
												navigateToEquipment(bar.id)
											}}
											variant='ghost'
											size='icon'
											className='rounded-full'
											title='Manage Equipment'
										>
											<Settings size={16} />
										</Button>

										{bar.isOwner && (
											<>
												<Button
													onClick={() => handleEditBar(bar.id)}
													variant='ghost'
													size='icon'
													className='rounded-full'
													title='Edit Brew Bar'
												>
													<Edit size={16} />
												</Button>

												<Button
													onClick={() => confirmDelete(bar.id, bar.name)}
													variant='ghost'
													size='icon'
													className='rounded-full'
													title='Delete Brew Bar'
												>
													<Trash size={16} />
												</Button>
											</>
										)}
									</div>
								</div>

								<div className='mt-4 flex justify-end'>
									<Button
										onClick={() => {
											router.push(`/brew-bars/${bar.id}`)
										}}
										variant='link'
									>
										View Details →
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</Section>

			{/* Create/Edit Modal */}
			<BrewBarFormModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				brewBarId={selectedBar || undefined}
				onSuccess={fetchBrewBars}
			/>

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				open={isConfirmDeleteOpen}
				onClose={() => setIsConfirmDeleteOpen(false)}
				onConfirm={handleDelete}
				title='Delete Brew Bar'
				description={`Are you sure you want to delete "${barToDelete?.name}"? This action cannot be undone and all members will lose access.`}
			/>
		</ProtectedPage>
	)
}
