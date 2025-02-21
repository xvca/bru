import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const links = [
	{ label: 'Autobru', href: '/' },
	{ label: 'Beans', href: '/beans' },
	{ label: 'Brews', href: '/brews' },
	{ label: 'ESP Settings', href: '/settings' },
]

const Appbar = () => {
	const router = useRouter()
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	return (
		<>
			{/* Overlay */}
			{isMenuOpen && (
				<div
					className='fixed inset-0 bg-black bg-opacity-50 z-30'
					onClick={toggleMenu}
				/>
			)}

			{/* Sliding Menu */}
			<div
				className={`fixed top-0 left-0 right-0 bg-background z-40 transform transition-transform duration-300 ease-in-out ${
					isMenuOpen ? 'translate-y-0' : '-translate-y-full'
				}`}
			>
				<div className='max-w-screen-md mx-auto px-4 py-6'>
					{links.map(({ label, href }) => (
						<Link
							key={label}
							href={href}
							onClick={() => setIsMenuOpen(false)}
							className={`block py-3 text-lg ${
								router.pathname === href
									? 'text-primary'
									: 'text-text hover:text-text-secondary'
							}`}
						>
							{label}
						</Link>
					))}
				</div>
			</div>

			{/* Main Appbar */}
			<div className='fixed top-0 left-0 z-20 w-full bg-background pt-safe'>
				<header className='border-b border-border bg-background px-safe'>
					<div className='mx-auto flex h-12 max-w-screen-md items-center justify-between px-4'>
						<Link href='/'>
							<h1 className='font-medium text-text'>Bru</h1>
						</Link>

						<button
							onClick={toggleMenu}
							className='p-2 focus:outline-none'
							aria-label='Toggle menu'
						>
							<div className='w-6 h-5 relative flex flex-col justify-between'>
								<span
									className={`w-full h-0.5 bg-text transform transition-all duration-300 ${
										isMenuOpen ? 'rotate-45 translate-y-2' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-text transition-all duration-300 ${
										isMenuOpen ? 'opacity-0' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-text transform transition-all duration-300 ${
										isMenuOpen ? '-rotate-45 -translate-y-2' : ''
									}`}
								/>
							</div>
						</button>
					</div>
				</header>
			</div>
		</>
	)
}

export default Appbar
