import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'
import { useBrewBarMembers } from '@/hooks/useBrewBarMembers'
import { Loader2, Trash, UserPlus, Shield } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteSchema, type InviteFormData } from '@/lib/validators'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BrewBarMembersModalProps {
	isOpen: boolean
	onClose: () => void
	brewBarId: number
	brewBarName: string
	isOwner: boolean
}

export default function BrewBarMembersModal({
	isOpen,
	onClose,
	brewBarId,
	brewBarName,
	isOwner,
}: BrewBarMembersModalProps) {
	const { user } = useAuth()
	const { members, isLoading, refresh } = useBrewBarMembers(
		isOpen ? brewBarId : undefined,
	)
	const [isInviting, setIsInviting] = useState(false)

	const form = useForm<InviteFormData>({
		resolver: zodResolver(inviteSchema),
		defaultValues: {
			username: '',
			role: 'Member',
		},
	})

	const onInvite = async (data: InviteFormData) => {
		setIsInviting(true)
		try {
			await axios.post(`/api/brew-bars/${brewBarId}/members`, data, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			toast.success(`Invited ${data.username} successfully`)
			form.reset()
			refresh()
		} catch (error) {
			console.error('Error inviting member:', error)
			if (axios.isAxiosError(error) && error.response?.status === 404) {
				toast.error('User not found')
			} else if (axios.isAxiosError(error) && error.response?.status === 409) {
				toast.error('User is already a member')
			} else {
				toast.error('Failed to invite member')
			}
		} finally {
			setIsInviting(false)
		}
	}

	const handleRemoveMember = async (memberId: number, username: string) => {
		try {
			await axios.delete(`/api/brew-bars/${brewBarId}/members/${memberId}`, {
				headers: { Authorization: `Bearer ${user?.token}` },
			})
			toast.success(`Removed ${username} from brew bar`)
			refresh()
		} catch (error) {
			console.error('Error removing member:', error)
			toast.error('Failed to remove member')
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Manage Members</DialogTitle>
					<DialogDescription>
						Members of <span className='font-medium'>{brewBarName}</span>
					</DialogDescription>
				</DialogHeader>

				{isOwner && (
					<div className='mb-4 p-4 bg-muted/50 rounded-lg'>
						<h4 className='text-sm font-medium mb-3'>Add New Member</h4>
						<form
							onSubmit={form.handleSubmit(onInvite)}
							className='flex gap-2 items-start'
						>
							<div className='flex-1 space-y-2'>
								<Controller
									name='username'
									control={form.control}
									render={({ field }) => (
										<Input
											{...field}
											placeholder='Username'
											className='h-9'
											autoComplete='off'
										/>
									)}
								/>
							</div>
							<div className='w-28'>
								<Controller
									name='role'
									control={form.control}
									render={({ field }) => (
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<SelectTrigger className='h-9'>
												<SelectValue placeholder='Role' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='Member'>Member</SelectItem>
												<SelectItem value='Admin'>Admin</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</div>
							<Button type='submit' size='sm' disabled={isInviting}>
								{isInviting ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : (
									<UserPlus className='h-4 w-4' />
								)}
							</Button>
						</form>
					</div>
				)}

				<div className='space-y-4'>
					<h4 className='text-sm font-medium text-muted-foreground'>
						Current Members ({members.length})
					</h4>

					{isLoading ? (
						<div className='flex justify-center py-4'>
							<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
						</div>
					) : (
						<ScrollArea className='h-[300px] pr-4'>
							<div className='space-y-3'>
								{members.map((member) => (
									<div
										key={member.userId}
										className='flex items-center justify-between group'
									>
										<div className='flex items-center gap-3'>
											<Avatar className='h-8 w-8'>
												<AvatarFallback>
													{member.user.username.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div>
												<p className='text-sm font-medium leading-none'>
													{member.user.username}
													{member.isCurrentUser && (
														<span className='ml-2 text-xs text-muted-foreground'>
															(You)
														</span>
													)}
												</p>
											</div>
										</div>

										<div className='flex items-center gap-2'>
											{isOwner && !member.isCurrentUser && (
												<Button
													variant='ghost'
													size='icon'
													className='h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
													onClick={() =>
														handleRemoveMember(
															member.userId,
															member.user.username,
														)
													}
												>
													<Trash className='h-4 w-4' />
												</Button>
											)}
											<Badge
												variant={
													member.role === 'Owner' ? 'default' : 'secondary'
												}
												className='text-xs font-normal'
											>
												{member.role === 'Owner' && (
													<Shield className='mr-1 h-3 w-3' />
												)}
												{member.role}
											</Badge>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
