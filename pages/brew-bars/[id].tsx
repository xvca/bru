import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import EquipmentFormModal from '@/components/EquipmentFormModal'
import GrinderFormModal from '@/components/GrinderFormModal'
import InviteMemberModal from '@/components/InviteMemberModal'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import { toast } from 'sonner'
import {
	Users,
	Coffee,
	Settings,
	ArrowLeft,
	UserPlus,
	MapPin,
	MoreVertical,
	Edit,
	Trash,
	Plus,
} from 'lucide-react'
import Link from 'next/link'

// UI Components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
	const [activeTab, setActiveTab] = useState('members')

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
				setActiveTab('equipment')
			} else {
				setActiveTab('members')
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
			console.error('Error fetching grinders:', error)
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

	const handleRemoveMember = async (userId: number) => {
		try {
			await axios.delete(`/api/brew-bars/${id}/members/${userId}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			await fetchMembers()
			toast.success('Member removed successfully')
		} catch (error) {
			console.error('Error removing member:', error)
			toast.error('Failed to remove member')
		}
	}

	const getInitials = (name: string) => {
		return name.slice(0, 2).toUpperCase()
	}

	if (isLoading) {
		return (
			<ProtectedPage title='Brew Bar Details'>
				<Section>
					<div className='space-y-6'>
						<div className='space-y-2'>
							<Skeleton className='h-4 w-24' />
							<div className='flex justify-between'>
								<Skeleton className='h-8 w-64' />
								<Skeleton className='h-10 w-32' />
							</div>
						</div>
						<Skeleton className='h-10 w-full max-w-sm' />
						<div className='space-y-4'>
							<Skeleton className='h-20 w-full' />
							<Skeleton className='h-20 w-full' />
						</div>
					</div>
				</Section>
			</ProtectedPage>
		)
	}

	if (!brewBar) return null

	return (
		<ProtectedPage title={`Brew Bar: ${brewBar.name}`}>
			<Section>
				<div className='space-y-6'>
					<div>
						<Button
							variant='link'
							className='px-0 text-muted-foreground hover:text-foreground mb-2'
							asChild
						>
							<Link href='/brew-bars'>
								<ArrowLeft className='mr-1 h-4 w-4' />
								Back to Brew Bars
							</Link>
						</Button>

						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
							<div>
								<h1 className='text-3xl font-bold tracking-tight'>
									{brewBar.name}
								</h1>
								{brewBar.location && (
									<div className='flex items-center text-muted-foreground mt-1'>
										<MapPin className='mr-1 h-4 w-4' />
										<span>{brewBar.location}</span>
									</div>
								)}
							</div>

							{brewBar.isOwner && (
								<Button onClick={() => setIsInviteModalOpen(true)}>
									<UserPlus className='mr-2 h-4 w-4' />
									Invite Members
								</Button>
							)}
						</div>
					</div>

					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className='w-full'
					>
						<TabsList className='w-full justify-start h-auto p-1 bg-muted/50 rounded-lg'>
							<TabsTrigger value='members' className='flex-1'>
								Members
							</TabsTrigger>
							<TabsTrigger value='equipment' className='flex-1'>
								Equipment
							</TabsTrigger>
						</TabsList>

						<TabsContent value='members' className='mt-6 space-y-4'>
							{members.length === 0 ? (
								<Card className='border-dashed'>
									<CardContent className='flex flex-col items-center justify-center py-12'>
										<div className='p-4 rounded-full bg-secondary/50 mb-4'>
											<Users className='h-8 w-8 text-muted-foreground/50' />
										</div>
										<p className='text-muted-foreground'>No members yet</p>
									</CardContent>
								</Card>
							) : (
								<div className='grid gap-4'>
									{members.map((member) => (
										<Card
											key={member.id}
											className='flex items-center justify-between p-4'
										>
											<div className='flex items-center gap-4'>
												<Avatar>
													<AvatarFallback className='bg-primary/10 text-primary'>
														{getInitials(member.user.username)}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className='flex items-center gap-2'>
														<p className='font-medium leading-none'>
															{member.user.username}
														</p>
														{member.isCurrentUser && (
															<Badge
																variant='secondary'
																className='text-[10px] px-1 h-5'
															>
																You
															</Badge>
														)}
													</div>
													<p className='text-sm text-muted-foreground mt-1'>
														{member.role || 'Member'}
													</p>
												</div>
											</div>

											{brewBar.isOwner && !member.isCurrentUser && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant='ghost' size='icon'>
															<MoreVertical className='h-4 w-4' />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align='end'>
														<DropdownMenuItem
															className='text-destructive focus:text-destructive'
															onClick={() => handleRemoveMember(member.userId)}
														>
															<Trash className='mr-2 h-4 w-4' />
															Remove Member
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</Card>
									))}
								</div>
							)}
						</TabsContent>

						<TabsContent value='equipment' className='mt-6 space-y-8'>
							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Settings className='h-5 w-5 text-muted-foreground' />
										<h2 className='text-xl font-semibold'>Grinders</h2>
									</div>
									<Button
										onClick={handleAddGrinder}
										variant='outline'
										size='sm'
									>
										<Plus className='mr-2 h-4 w-4' />
										Add Grinder
									</Button>
								</div>

								{grinders.length === 0 ? (
									<Card className='border-dashed'>
										<CardContent className='flex flex-col items-center justify-center py-8'>
											<p className='text-muted-foreground text-sm'>
												No grinders added yet
											</p>
										</CardContent>
									</Card>
								) : (
									<div className='grid gap-4 md:grid-cols-2'>
										{grinders.map((grinder) => (
											<Card key={grinder.id} className='relative group'>
												<CardHeader className='p-4'>
													<div className='flex justify-between items-start'>
														<div>
															<CardTitle className='text-base'>
																{grinder.name}
															</CardTitle>
															{grinder.burrType && (
																<CardDescription>
																	{grinder.burrType}
																</CardDescription>
															)}
														</div>
														<Button
															variant='ghost'
															size='icon'
															className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
															onClick={() => handleEditGrinder(grinder.id)}
														>
															<Edit className='h-4 w-4 text-muted-foreground' />
														</Button>
													</div>
												</CardHeader>
											</Card>
										))}
									</div>
								)}
							</div>

							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Coffee className='h-5 w-5 text-muted-foreground' />
										<h2 className='text-xl font-semibold'>Equipment</h2>
									</div>
									<Button
										onClick={handleAddEquipment}
										variant='outline'
										size='sm'
									>
										<Plus className='mr-2 h-4 w-4' />
										Add Equipment
									</Button>
								</div>

								{equipment.length === 0 ? (
									<Card className='border-dashed'>
										<CardContent className='flex flex-col items-center justify-center py-8'>
											<p className='text-muted-foreground text-sm'>
												No equipment added yet
											</p>
										</CardContent>
									</Card>
								) : (
									<div className='grid gap-4 md:grid-cols-2'>
										{equipment.map((item) => (
											<Card key={item.id} className='relative group'>
												<CardHeader className='p-4'>
													<div className='flex justify-between items-start'>
														<div>
															<CardTitle className='text-base'>
																{item.name}
															</CardTitle>
															{item.type && (
																<CardDescription>{item.type}</CardDescription>
															)}
														</div>
														<Button
															variant='ghost'
															size='icon'
															className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
															onClick={() => handleEditEquipment(item.id)}
														>
															<Edit className='h-4 w-4 text-muted-foreground' />
														</Button>
													</div>
												</CardHeader>
											</Card>
										))}
									</div>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</Section>

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
				onSuccess={fetchGrinders}
			/>

			<InviteMemberModal
				isOpen={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
				brewBarId={Number(id)}
				onSuccess={fetchMembers}
			/>
		</ProtectedPage>
	)
}
