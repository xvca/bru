import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import ProtectedPage from '@/components/ProtectedPage'
import Section from '@/components/Section'
import InviteMemberModal from '@/components/InviteMemberModal'
import { useAuth } from '@/lib/authContext'
import axios from 'axios'
import { toast } from 'sonner'
import {
	Users,
	ArrowLeft,
	UserPlus,
	MapPin,
	MoreVertical,
	Trash,
} from 'lucide-react'
import Link from 'next/link'
import { Prisma } from 'generated/prisma/client'

// UI Components
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type BrewBarDetails = Prisma.BrewBarGetPayload<{}> & {
	role: string
	isOwner: boolean
}

type BrewBarMemberWithUser = Prisma.BrewBarMemberGetPayload<{
	include: {
		user: {
			select: {
				id: true
				username: true
			}
		}
	}
}> & {
	isCurrentUser: boolean
}

export default function BrewBarDetailPage() {
	const router = useRouter()
	const { id } = router.query
	const { user } = useAuth()

	const [brewBar, setBrewBar] = useState<BrewBarDetails | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [members, setMembers] = useState<BrewBarMemberWithUser[]>([])
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

	useEffect(() => {
		if (id && user) {
			fetchBrewBarDetails()
		}
	}, [id, user])

	const fetchBrewBarDetails = async () => {
		try {
			setIsLoading(true)
			const { data } = await axios.get<BrewBarDetails>(`/api/brew-bars/${id}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			setBrewBar(data)
			await fetchMembers()
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
			const { data } = await axios.get<BrewBarMemberWithUser[]>(
				`/api/brew-bars/${id}/members`,
				{
					headers: { Authorization: `Bearer ${user?.token}` },
				},
			)
			setMembers(data)
		} catch (error) {
			console.error('Error fetching members:', error)
		}
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

					<div className='space-y-4'>
						<div className='flex items-center gap-2'>
							<Users className='h-5 w-5 text-muted-foreground' />
							<h2 className='text-xl font-semibold'>Members</h2>
						</div>

						{members.length === 0 ? (
							<Card className='border-dashed'>
								<CardContent className='flex flex-col items-center justify-center py-12'>
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
					</div>
				</div>
			</Section>

			<InviteMemberModal
				isOpen={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
				brewBarId={Number(id)}
				onSuccess={fetchMembers}
			/>
		</ProtectedPage>
	)
}
