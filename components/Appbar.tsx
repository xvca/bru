import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
import { LogOut, Store, User, ChevronDown, Menu, LogIn } from 'lucide-react'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Sheet,
	SheetTitle,
	SheetContent,
	SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from './ui/separator'

const Appbar = () => {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const { user, logout } = useAuth()
	const { activeBarId, setActiveBarId, availableBars } = useBrewBar()

	const handleLogout = () => {
		logout()
		setIsOpen(false)
	}

	const links = [
		{ label: 'Autobru', href: '/' },
		...(user
			? [
					{ label: 'Beans', href: '/beans' },
					{ label: 'Brews', href: '/brews' },
					{ label: 'Equipment', href: '/equipment' },
					{ label: 'Brew Bars', href: '/brew-bars' },
				]
			: []),
		{ label: 'Settings', href: '/settings' },
	]

	const currentContextName = activeBarId
		? availableBars.find((b) => b.id === activeBarId)?.name
		: 'Personal'

	return (
		<div className='fixed top-0 left-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-border pt-safe'>
			<header className='px-safe'>
				<div className='mx-auto flex h-14 max-w-(--breakpoint-md) items-center justify-between px-4'>
					<div className='flex items-center gap-4'>
						<Link
							href='/'
							className='font-bold text-xl flex items-center gap-2'
						>
							<span>Bru</span>
						</Link>

						{user ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant='outline'
										size='sm'
										className='h-8 gap-1 px-2 text-xs font-normal border-dashed hidden sm:flex'
									>
										{activeBarId ? <Store size={12} /> : <User size={12} />}
										<span className='max-w-[100px] truncate'>
											{currentContextName}
										</span>
										<ChevronDown size={10} className='opacity-50' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start'>
									<DropdownMenuLabel className='text-xs text-muted-foreground'>
										Switch Context
									</DropdownMenuLabel>

									<DropdownMenuItem onClick={() => setActiveBarId(null)}>
										<User className='mr-2 h-4 w-4' />
										<span>Personal Space</span>
										{!activeBarId && (
											<span className='ml-auto text-xs opacity-50'>Active</span>
										)}
									</DropdownMenuItem>

									{availableBars.length > 0 && <DropdownMenuSeparator />}

									{availableBars.map((bar) => (
										<DropdownMenuItem
											key={bar.id}
											onClick={() => setActiveBarId(bar.id)}
										>
											<Store className='mr-2 h-4 w-4' />
											<span>{bar.name}</span>
											{activeBarId === bar.id && (
												<span className='ml-auto text-xs opacity-50'>
													Active
												</span>
											)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<></>
						)}
					</div>

					<Sheet open={isOpen} onOpenChange={setIsOpen}>
						<SheetTrigger asChild>
							<Button variant='ghost' size='icon'>
								<Menu className='h-5 w-5' />
								<span className='sr-only'>Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side='top' aria-describedby=''>
							<SheetTitle className='sr-only'>Menu</SheetTitle>
							<div className='flex flex-col gap-2 mt-4 sm:mt-0'>
								{user && (
									<div className='sm:hidden mb-4 p-4 bg-muted/50 rounded-lg'>
										<p className='text-xs font-medium text-muted-foreground mb-2'>
											Current Context
										</p>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant='outline'
													className='w-full justify-between'
												>
													<div className='flex items-center gap-2'>
														{activeBarId ? (
															<Store size={14} />
														) : (
															<User size={14} />
														)}
														<span>{currentContextName}</span>
													</div>
													<ChevronDown size={14} className='opacity-50' />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent className='w-[280px]'>
												<DropdownMenuItem onClick={() => setActiveBarId(null)}>
													<User className='mr-2 h-4 w-4' />
													<span>Personal Space</span>
												</DropdownMenuItem>
												{availableBars.map((bar) => (
													<DropdownMenuItem
														key={bar.id}
														onClick={() => setActiveBarId(bar.id)}
													>
														<Store className='mr-2 h-4 w-4' />
														<span>{bar.name}</span>
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								)}

								{links.map(({ label, href }) => (
									<Link
										key={label}
										href={href}
										onClick={() => setIsOpen(false)}
										className={`block py-2 text-lg font-medium transition-colors ${
											router.pathname === href
												? 'text-primary'
												: 'text-muted-foreground hover:text-foreground'
										}`}
									>
										{label}
									</Link>
								))}

								{user ? (
									<>
										<Separator />
										<button
											onClick={handleLogout}
											className='flex items-center w-full py-2 text-lg text-destructive hover:text-destructive/80 font-medium'
										>
											<LogOut size={18} className='mr-2' />
											Logout
										</button>
									</>
								) : process.env.NEXT_PUBLIC_LITE !== 'true' ? (
									<>
										<Separator />
										<Link
											href='/login'
											onClick={() => setIsOpen(false)}
											className='flex items-center w-full py-2 text-lg font-medium text-primary'
										>
											<LogIn size={18} className='mr-2' />
											Login / Sign Up
										</Link>
									</>
								) : null}
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</header>
		</div>
	)
}

export default Appbar
