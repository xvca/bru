import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useAuth } from '@/lib/authContext'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import {
	Loader2,
	Plus,
	Coffee,
	Clock,
	Thermometer,
	Star,
	Edit,
	Trash,
} from 'lucide-react'
import BrewForm from '@/components/BrewForm'
import { ConfirmModal } from '@/components/ConfirmModal'

interface Bean {
	name: string
	roaster: string | null
}

interface Method {
	name: string
}

interface Brew {
	id: number
	beanId: number
	methodId: number
	doseWeight: number
	yieldWeight: number | null
	brewTime: number | null
	grindSize: string | null
	waterTemperature: number | null
	rating: number | null
	tastingNotes: string | null
	brewDate: string
	bean: Bean
	method: Method
}

export default function Brews() {
	const { user } = useAuth()
	const [brews, setBrews] = useState<Brew[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBrew, setSelectedBrew] = useState<number | undefined>(
		undefined,
	)

	const [deleteModal, setDeleteModal] = useState({
		isOpen: false,
		brewId: 0,
		brewName: '',
	})

	// Fetch brews when component mounts or user changes
	useEffect(() => {
		if (user) {
			fetchBrews()
		}
	}, [user])

	const fetchBrews = async () => {
		setIsLoading(true)
		try {
			const { data } = await axios.get<Brew[]>('/api/brews', {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setBrews(data)
		} catch (error) {
			console.error('Error fetching brews:', error)
			toast.error('Failed to load brews')
		} finally {
			setIsLoading(false)
		}
	}

	const handleAddBrew = () => {
		setSelectedBrew(undefined) // Ensure we're in "add" mode
		setIsFormOpen(true)
	}

	const handleEditBrew = (id: number) => {
		setSelectedBrew(id)
		setIsFormOpen(true)
	}

	const handleDeleteBrew = async (id: number) => {
		try {
			await axios.delete(`/api/brews/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBrews(brews.filter((brew) => brew.id !== id))
			toast.success('Brew deleted successfully')
		} catch (error) {
			console.error('Error deleting brew:', error)
			toast.error('Failed to delete brew')
		} finally {
			setDeleteModal({ ...deleteModal, isOpen: false })
		}
	}

	const confirmDeleteBrew = (id: number, name: string) => {
		setDeleteModal({
			isOpen: true,
			brewId: id,
			brewName: name,
		})
	}

	const formatBrewTime = (seconds: number | null) => {
		if (!seconds) return 'N/A'
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	// Render star rating
	const renderRating = (rating: number | null) => {
		if (rating === null) return null

		return (
			<div className='flex'>
				{[1, 2, 3, 4, 5].map((star) => (
					<span
						key={star}
						className={`text-sm ${rating >= star ? 'text-yellow-500' : 'text-text-secondary'}`}
					>
						★
					</span>
				))}
			</div>
		)
	}

	return (
		<ProtectedPage title='Brew Logs'>
			<Toaster position='top-center' />
			<Section>
				<div className='flex justify-between items-center mb-6'>
					<h1 className='text-2xl font-bold'>Brew Logs</h1>
					<button
						onClick={handleAddBrew}
						className='flex items-center gap-1 px-3 py-2 bg-text text-background rounded-md'
					>
						<Plus size={18} />
						<span>Log Brew</span>
					</button>
				</div>

				{isLoading ? (
					<div className='flex justify-center items-center h-40'>
						<Loader2 className='w-8 h-8 animate-spin' />
					</div>
				) : brews.length === 0 ? (
					<div className='text-center py-12 space-y-4 border border-dashed border-border rounded-lg'>
						<Coffee size={48} className='mx-auto opacity-30' />
						<p>No brews recorded yet</p>
						<button
							onClick={handleAddBrew}
							className='text-primary-light hover:underline'
						>
							Log your first brew
						</button>
					</div>
				) : (
					<div className='space-y-4'>
						{brews.map((brew) => (
							<div
								key={brew.id}
								className='border border-border rounded-lg p-4'
							>
								<div className='flex justify-between'>
									<div>
										<h3 className='text-lg font-medium'>
											{brew.bean.name}{' '}
											<span className='text-sm text-text-secondary'>
												• {brew.method.name}
											</span>
										</h3>

										{brew.bean.roaster && (
											<p className='text-sm text-text-secondary'>
												{brew.bean.roaster}
											</p>
										)}
									</div>

									<div className='flex gap-2'>
										<button
											onClick={() => handleEditBrew(brew.id)}
											className='p-1 hover:bg-input-border rounded transition-colors'
										>
											<Edit size={16} />
										</button>
										<button
											onClick={() => confirmDeleteBrew(brew.id, brew.bean.name)}
											className='p-1 hover:bg-input-border rounded transition-colors text-error'
										>
											<Trash size={16} />
										</button>
									</div>
								</div>

								<div className='mt-2 text-sm text-text-secondary'>
									{format(new Date(brew.brewDate), 'MMM d, yyyy • h:mm a')}
								</div>

								<div className='mt-3 flex flex-wrap gap-x-4 gap-y-2'>
									<div className='text-sm'>
										<span className='text-text-secondary'>Dose:</span>{' '}
										<span className='font-medium'>{brew.doseWeight}g</span>
										{brew.yieldWeight && (
											<>
												{' → '}
												<span className='font-medium'>{brew.yieldWeight}g</span>
												<span className='text-xs text-text-secondary ml-1'>
													({(brew.yieldWeight / brew.doseWeight).toFixed(1)}x)
												</span>
											</>
										)}
									</div>

									{brew.brewTime && (
										<div className='flex items-center gap-1 text-sm'>
											<Clock size={14} />
											<span>{formatBrewTime(brew.brewTime)}</span>
										</div>
									)}

									{brew.waterTemperature && (
										<div className='flex items-center gap-1 text-sm'>
											<Thermometer size={14} />
											<span>{brew.waterTemperature}°C</span>
										</div>
									)}

									{brew.grindSize && (
										<div className='text-sm'>
											<span className='text-text-secondary'>Grind:</span>{' '}
											<span>{brew.grindSize}</span>
										</div>
									)}
								</div>

								{(brew.rating !== null || brew.tastingNotes) && (
									<div className='mt-3 pt-3 border-t border-border'>
										{brew.rating !== null && (
											<div className='mb-1'>{renderRating(brew.rating)}</div>
										)}

										{brew.tastingNotes && (
											<p className='text-sm mt-1'>{brew.tastingNotes}</p>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</Section>

			{/* Brew Form Modal */}
			<BrewForm
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				brewId={selectedBrew}
				onSuccess={fetchBrews}
			/>

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				open={deleteModal.isOpen}
				onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
				onConfirm={() => handleDeleteBrew(deleteModal.brewId)}
				title='Delete Brew'
				description={`Are you sure you want to delete this brew of ${deleteModal.brewName}? This action cannot be undone.`}
			/>
		</ProtectedPage>
	)
}
