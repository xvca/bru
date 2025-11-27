import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { LogOut } from 'lucide-react'
import { Button } from './ui/button'

const links = [
	{ label: 'Autobru', href: '/' },
	{ label: 'Beans', href: '/beans' },
	{ label: 'Brews', href: '/brews' },
	{ label: 'Brew Bars', href: '/brew-bars' },
	{ label: 'Settings', href: '/settings' },
]

const Appbar = () => {
	const router = useRouter()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const { user, logout } = useAuth()

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	const handleLogout = () => {
		logout()
		setIsMenuOpen(false)
	}

	return (
		<>
			{/* Overlay */}
			{isMenuOpen && (
				<div
					className='fixed inset-0 bg-black opacity-50 z-30'
					onClick={toggleMenu}
				/>
			)}

			{/* Sliding Menu */}
			<div
				className={`fixed top-0 left-0 right-0 bg-background z-40 transform transition-transform duration-300 ease-in-out ${
					isMenuOpen ? 'translate-y-0' : '-translate-y-full'
				}`}
			>
				<div className='max-w-(--breakpoint-md) mx-auto px-4 py-6'>
					{links.map(({ label, href }) => (
						<Link
							key={label}
							href={href}
							onClick={() => setIsMenuOpen(false)}
							className={`block py-3 text-lg ${
								router.pathname === href
									? 'text-primary'
									: 'text-text hover:text-primary'
							}`}
						>
							{label}
						</Link>
					))}

					{/* Add logout button if user is logged in */}
					{user && (
						<button
							onClick={handleLogout}
							className='flex items-center w-full py-3 text-lg text-text hover:text-primary'
						>
							<LogOut size={18} className='mr-2' />
							Logout
						</button>
					)}
				</div>
			</div>

			{/* Main Appbar */}
			<div className='fixed top-0 left-0 z-20 w-full bg-background pt-safe'>
				<header className='border-b border-border bg-background px-safe'>
					<div className='mx-auto flex h-12 max-w-(--breakpoint-md) items-center justify-between px-4'>
						<Button variant='ghost'>
							<Link href='/'>
								<h1 className='font-medium text-text'>Bru</h1>
							</Link>
						</Button>

						<Button
							onClick={toggleMenu}
							aria-label='Toggle menu'
							variant='ghost'
							size='sm'
						>
							<div className='w-6 h-5 relative flex flex-col justify-between'>
								<span
									className={`w-full h-0.5 bg-foreground transform transition-all duration-300 ${
										isMenuOpen ? 'rotate-45 translate-y-2' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-foreground transition-all duration-300 ${
										isMenuOpen ? 'opacity-0' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-foreground transform transition-all duration-300 ${
										isMenuOpen ? '-rotate-45 -translate-y-2' : ''
									}`}
								/>
							</div>
						</Button>
					</div>
				</header>
			</div>
		</>
	)
}

export default Appbar
