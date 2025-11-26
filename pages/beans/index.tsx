import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import type { Bean } from '@prisma/client'
import {
	Loader2,
	Plus,
	Coffee,
	Calendar,
	Star,
	Edit,
	Trash,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { format } from 'date-fns'
import { ConfirmModal } from '@/components/ConfirmModal'
import BeanFormModal from '@/components/BeanFormModal'

export default function BeansPage() {
	const { user } = useAuth()
	const [beans, setBeans] = useState<Bean[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [modalData, setModalData] = useState({
		isOpen: false,
		beanId: -1,
		beanName: '',
	})

	// Bean form modal state
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>(
		undefined,
	)

	// Fetch beans on component mount
	useEffect(() => {
		if (user) {
			fetchBeans()
		}
	}, [user])

	const fetchBeans = async () => {
		try {
			setIsLoading(true)

			const { data } = await axios.get('/api/beans', {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBeans(data)
		} catch (error) {
			console.error('Error fetching beans:', error)
			toast.error('Failed to load beans')
		} finally {
			setIsLoading(false)
		}
	}

	const handleAddNew = () => {
		setSelectedBeanId(undefined)
		setIsFormOpen(true)
	}

	const handleEdit = (id: number) => {
		setSelectedBeanId(id)
		setIsFormOpen(true)
	}

	const handleDelete = async (id: number) => {
		try {
			await axios.delete(`/api/beans/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBeans(beans.filter((bean) => bean.id !== id))
			toast.success('Bean deleted successfully')
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
		setModalData({
			isOpen: true,
			beanId: id,
			beanName: name,
		})
	}

	// Helper function to format dates
	const formatDate = (date: Date | string | null) => {
		if (!date) return 'N/A'
		return format(new Date(date), 'MMM d, yyyy')
	}

	// Calculate freshness indicator
	const getFreshnessClass = (roastDate: Date | string) => {
		const now = new Date()
		const roasted = new Date(roastDate)
		const daysDifference = Math.floor(
			(now.getTime() - roasted.getTime()) / (1000 * 60 * 60 * 24),
		)

		if (daysDifference <= 7) return 'bg-success'
		if (daysDifference <= 21) return 'bg-yellow-500'
		return 'bg-error'
	}

	return (
		<ProtectedPage title='Coffee Beans'>
			<Toaster position='top-center' />
			<Section>
				<div className='flex justify-between items-center mb-6'>
					<h1 className='text-2xl font-bold'>Coffee Beans</h1>
					<button
						onClick={handleAddNew}
						className='flex items-center gap-1 px-3 py-2 bg-text text-background rounded-md'
					>
						<Plus size={18} />
						<span>Add Bean</span>
					</button>
				</div>

				{isLoading ? (
					<div className='flex justify-center items-center h-40'>
						<Loader2 className='w-8 h-8 animate-spin' />
					</div>
				) : beans.length === 0 ? (
					<div className='text-center py-12 space-y-4 border border-dashed border-border rounded-lg'>
						<Coffee size={48} className='mx-auto opacity-30' />
						<p>No coffee beans added yet</p>
						<button
							onClick={handleAddNew}
							className='text-primary-light hover:underline'
						>
							Add your first coffee bean
						</button>
					</div>
				) : (
					<div className='space-y-4'>
						{beans.map((bean) => (
							<div
								key={bean.id}
								className='border border-border rounded-lg p-4 relative'
							>
								{/* Freshness indicator dot */}
								<div
									className={`w-3 h-3 rounded-full absolute right-4 top-4 ${getFreshnessClass(bean.roastDate)}`}
									title={`Roasted ${formatDate(bean.roastDate)}`}
								/>

								<div className='flex flex-col gap-1'>
									<div className='flex justify-between'>
										<h3 className='text-lg font-medium'>{bean.name}</h3>
										<div className='flex gap-2'>
											<button
												onClick={() => handleEdit(bean.id)}
												className='p-1 hover:bg-input-border rounded transition-colors'
											>
												<Edit size={16} />
											</button>
											<button
												onClick={() => confirmDelete(bean.id, bean.name)}
												className='p-1 hover:bg-input-border rounded transition-colors text-error'
											>
												<Trash size={16} />
											</button>
										</div>
									</div>

									{bean.roaster && (
										<div className='text-text-secondary text-sm'>
											{bean.roaster}
										</div>
									)}

									<div className='flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-text-secondary'>
										{bean.origin && (
											<div className='flex items-center gap-1'>
												<Coffee size={14} />
												<span>{bean.origin}</span>
											</div>
										)}

										<div className='flex items-center gap-1'>
											<Calendar size={14} />
											<span>{formatDate(bean.roastDate)}</span>
										</div>

										{bean.roastLevel && (
											<div className='flex items-center gap-1'>
												<Star size={14} />
												<span>{bean.roastLevel}</span>
											</div>
										)}
									</div>

									<div className='mt-3 flex items-center gap-x-4'>
										<div className='text-sm'>
											<div className='text-text-secondary'>Remaining</div>
											<div className='font-medium'>
												{bean.remainingWeight
													? `${bean.remainingWeight}g`
													: 'N/A'}
												<span className='text-text-secondary text-xs ml-1'>
													/ {bean.initialWeight}g
												</span>
											</div>
										</div>

										{/* Progress bar for remaining weight */}
										{bean.remainingWeight !== null && (
											<div className='flex-1 h-2 bg-input-border rounded-full overflow-hidden'>
												<div
													className='h-2 bg-primary transition-all'
													style={{
														width: `${Math.min(100, (bean.remainingWeight / bean.initialWeight) * 100)}%`,
													}}
												/>
											</div>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</Section>

			{/* Bean Form Modal */}
			<BeanFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				beanId={selectedBeanId}
				onSuccess={fetchBeans}
			/>

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				open={modalData.isOpen}
				onClose={() => setModalData({ ...modalData, isOpen: false })}
				onConfirm={() => handleDelete(modalData.beanId)}
				title='Delete Coffee Bean'
				description={`Are you sure you want to delete "${modalData.beanName}"? This action cannot be undone.`}
			/>
		</ProtectedPage>
	)
}
