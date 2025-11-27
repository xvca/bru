import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import EquipmentFormModal from '@/components/EquipmentFormModal'
import GrinderFormModal from '@/components/GrinderFormModal'
import InviteMemberModal from '@/components/InviteMemberModal'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
	Loader2,
	Users,
	Coffee,
	Settings,
	ArrowLeft,
	UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { Tab } from '@headlessui/react'

// Types
interface BrewBar {
	id: number
	name: string
	location: string | null
	createdAt: string
	role: string
	isOwner: boolean
}

interface BrewBarMember {
	id: number
	userId: number
	role: string
	isCurrentUser: boolean
	user: {
		id: number
		username: string
	}
}

interface Equipment {
	id: number
	name: string
	type: string | null
}

interface Grinder {
	id: number
	name: string
	burrType: string | null
}

export default function BrewBarDetailPage() {
	const router = useRouter()
	const { id } = router.query
	const { user } = useAuth()

	const [brewBar, setBrewBar] = useState<BrewBar | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedTab, setSelectedTab] = useState(() => {
		// Default to 0 (Members tab) or use query param
		if (typeof window !== 'undefined') {
			return new URLSearchParams(window.location.search).get('tab') ===
				'equipment'
				? 1
				: 0
		}
		return 0
	})

	const [members, setMembers] = useState<BrewBarMember[]>([])
	const [equipment, setEquipment] = useState<Equipment[]>([])
	const [grinders, setGrinders] = useState<Grinder[]>([])

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
	const [isEquipmentFormOpen, setIsEquipmentFormOpen] = useState(false)
	const [isGrinderFormOpen, setIsGrinderFormOpen] = useState(false)
	const [selectedEquipmentId, setSelectedEquipmentId] = useState<
		number | undefined
	>(undefined)
	const [selectedGrinderId, setSelectedGrinderId] = useState<
		number | undefined
	>(undefined)

	useEffect(() => {
		if (router.isReady) {
			const tab = router.query.tab as string
			if (tab === 'equipment') {
				setSelectedTab(1)
			} else if (tab === 'members') {
				setSelectedTab(0)
			}
		}
	}, [router.isReady, router.query.tab])

	useEffect(() => {
		if (id && user) {
			fetchBrewBarDetails()
		}
	}, [id, user])

	const fetchBrewBarDetails = async () => {
		try {
			setIsLoading(true)

			const { data } = await axios.get(`/api/brew-bars/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})

			setBrewBar(data)

			// Fetch members, equipment, and grinders in parallel
			await Promise.all([fetchMembers(), fetchEquipment(), fetchGrinders()])
		} catch (error) {
			console.error('Error fetching brew bar details:', error)
			toast.error('Failed to load brew bar details')

			if (axios.isAxiosError(error) && error.response?.status === 404) {
				router.push('/brew-bars')
			}
		} finally {
			setIsLoading(false)
		}
	}

	const fetchMembers = async () => {
		try {
			const { data } = await axios.get(`/api/brew-bars/${id}/members`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setMembers(data)
		} catch (error) {
			console.error('Error fetching members:', error)
		}
	}

	const fetchGrinders = async () => {
		try {
			const { data } = await axios.get(`/api/brew-bars/${id}/grinders`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setGrinders(data)
		} catch (error) {
			console.error('Error fetching equipment:', error)
		}
	}

	const fetchEquipment = async () => {
		try {
			const { data } = await axios.get(`/api/brew-bars/${id}/equipment`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setEquipment(data)
		} catch (error) {
			console.error('Error fetching equipment:', error)
		}
	}

	const handleAddEquipment = () => {
		setSelectedEquipmentId(undefined)
		setIsEquipmentFormOpen(true)
	}

	const handleEditEquipment = (id: number) => {
		setSelectedEquipmentId(id)
		setIsEquipmentFormOpen(true)
	}

	const handleAddGrinder = () => {
		setSelectedGrinderId(undefined)
		setIsGrinderFormOpen(true)
	}

	const handleEditGrinder = (id: number) => {
		setSelectedGrinderId(id)
		setIsGrinderFormOpen(true)
	}

	// Add handler for member removal
	const handleRemoveMember = async (userId: number) => {
		try {
			await axios.delete(`/api/brew-bars/${id}/members/${userId}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			await fetchMembers() // Refresh member list
			toast.success('Member removed successfully')
		} catch (error) {
			console.error('Error removing member:', error)
			toast.error('Failed to remove member')
		}
	}

	if (isLoading) {
		return (
			<ProtectedPage title='Brew Bar Details'>
				<div className='flex justify-center items-center h-40'>
					<Loader2 className='w-8 h-8 animate-spin' />
				</div>
			</ProtectedPage>
		)
	}

	if (!brewBar) {
		return (
			<ProtectedPage title='Brew Bar Not Found'>
				<Section>
					<div className='text-center py-12'>
						<p className='mb-4'>
							{"This brew bar doesn't exist or you don't have access to it."}
						</p>
						<Link
							href='/brew-bars'
							className='text-primary-light hover:underline'
						>
							Return to Brew Bars
						</Link>
					</div>
				</Section>
			</ProtectedPage>
		)
	}

	return (
		<ProtectedPage title={`Brew Bar: ${brewBar.name}`}>
			<Toaster position='top-center' />
			<Section>
				<div className='mb-6'>
					<Link
						href='/brew-bars'
						className='flex items-center gap-1 text-text-secondary hover:text-text mb-4'
					>
						<ArrowLeft size={16} />
						<span>Back to Brew Bars</span>
					</Link>

					<div className='flex justify-between items-start'>
						<div>
							<h1 className='text-2xl font-bold'>{brewBar.name}</h1>
							{brewBar.location && (
								<p className='text-text-secondary'>{brewBar.location}</p>
							)}
						</div>

						{brewBar.isOwner && (
							<button
								onClick={() => setIsInviteModalOpen(true)}
								className='flex items-center gap-1 px-3 py-2 bg-text text-background rounded-md'
							>
								<UserPlus size={18} />
								<span>Invite Members</span>
							</button>
						)}
					</div>
				</div>

				<Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
					<Tab.List className='flex space-x-1 rounded-xl bg-input-border p-1'>
						<Tab
							className={({ selected }) =>
								`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-hidden focus:ring-2
                ${
									selected
										? 'bg-background shadow text-text'
										: 'text-text-secondary hover:bg-border hover:text-text'
								}`
							}
						>
							Members
						</Tab>
						<Tab
							className={({ selected }) =>
								`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-hidden focus:ring-2
                ${
									selected
										? 'bg-background shadow text-text'
										: 'text-text-secondary hover:bg-border hover:text-text'
								}`
							}
						>
							Equipment
						</Tab>
					</Tab.List>

					<Tab.Panels className='mt-6'>
						{/* Members Tab */}
						<Tab.Panel>
							<div className='space-y-4'>
								<div className='flex justify-between items-center mb-4'>
									<h2 className='text-lg font-medium'>Members</h2>
								</div>

								{members.length === 0 ? (
									<div className='text-center py-8 border border-dashed border-border rounded-lg'>
										<Users size={32} className='mx-auto opacity-30 mb-2' />
										<p>No members yet</p>
									</div>
								) : (
									<div className='space-y-2'>
										{members.map((member) => (
											<div
												key={member.id}
												className='p-3 border border-border rounded-lg flex justify-between items-center'
											>
												<div className='flex items-center gap-2'>
													<div className='bg-primary-light text-white rounded-full w-8 h-8 flex items-center justify-center'>
														{member.user.username.substring(0, 1).toUpperCase()}
													</div>
													<div>
														<p className='font-medium'>
															{member.user.username}
															{member.isCurrentUser && (
																<span className='text-text-secondary text-sm ml-2'>
																	(You)
																</span>
															)}
														</p>
														<p className='text-sm text-text-secondary'>
															{member.role || 'Member'}
														</p>
													</div>
												</div>

												{brewBar.isOwner && !member.isCurrentUser && (
													<button
														onClick={() => handleRemoveMember(member.userId)}
														className='text-error text-sm hover:underline'
													>
														Remove
													</button>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</Tab.Panel>

						{/* Equipment Tab */}
						<Tab.Panel>
							<div className='space-y-6'>
								{/* Grinders Section */}
								<div>
									<div className='flex justify-between items-center mb-4'>
										<h2 className='text-lg font-medium'>Grinders</h2>
										<button
											onClick={handleAddGrinder}
											className='text-primary-light text-sm hover:underline'
										>
											Add Grinder
										</button>
									</div>

									{grinders.length === 0 ? (
										<div className='text-center py-8 border border-dashed border-border rounded-lg'>
											<Settings size={32} className='mx-auto opacity-30 mb-2' />
											<p>No grinders added yet</p>
										</div>
									) : (
										<div className='space-y-2'>
											{grinders.map((grinder) => (
												<div
													key={grinder.id}
													className='p-3 border border-border rounded-lg'
												>
													<p className='font-medium'>{grinder.name}</p>
													{grinder.burrType && (
														<p className='text-sm text-text-secondary'>
															{grinder.burrType}
														</p>
													)}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Equipment Section */}
								<div>
									<div className='flex justify-between items-center mb-4'>
										<h2 className='text-lg font-medium'>Equipment</h2>
										<button
											onClick={handleAddEquipment}
											className='text-primary-light text-sm hover:underline'
										>
											Add Equipment
										</button>
									</div>

									{equipment.length === 0 ? (
										<div className='text-center py-8 border border-dashed border-border rounded-lg'>
											<Coffee size={32} className='mx-auto opacity-30 mb-2' />
											<p>No equipment added yet</p>
										</div>
									) : (
										<div className='space-y-2'>
											{equipment.map((item) => (
												<div
													key={item.id}
													className='p-3 border border-border rounded-lg'
												>
													<p className='font-medium'>{item.name}</p>
													{item.type && (
														<p className='text-sm text-text-secondary'>
															{item.type}
														</p>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</Tab.Panel>
					</Tab.Panels>
				</Tab.Group>
			</Section>
			<>
				<EquipmentFormModal
					isOpen={isEquipmentFormOpen}
					onClose={() => setIsEquipmentFormOpen(false)}
					brewBarId={Number(id)}
					equipmentId={selectedEquipmentId}
					onSuccess={fetchEquipment}
				/>

				<GrinderFormModal
					isOpen={isGrinderFormOpen}
					onClose={() => setIsGrinderFormOpen(false)}
					brewBarId={Number(id)}
					grinderId={selectedGrinderId}
					onSuccess={fetchEquipment}
				/>

				<InviteMemberModal
					isOpen={isInviteModalOpen}
					onClose={() => setIsInviteModalOpen(false)}
					brewBarId={Number(id)}
					onSuccess={fetchMembers}
				/>
			</>
		</ProtectedPage>
	)
}
