import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const links = [
	{ label: 'Autobru', href: '/' },
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
				className={`fixed top-0 left-0 right-0 bg-zinc-100 dark:bg-zinc-900 z-40 transform transition-transform duration-300 ease-in-out ${
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
									? 'text-indigo-500 dark:text-indigo-400'
									: 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
							}`}
						>
							{label}
						</Link>
					))}
				</div>
			</div>

			{/* Main Appbar */}
			<div className='fixed top-0 left-0 z-20 w-full bg-zinc-900 pt-safe'>
				<header className='border-b bg-zinc-100 px-safe dark:border-zinc-800 dark:bg-zinc-900'>
					<div className='mx-auto flex h-12 max-w-screen-md items-center justify-between px-4'>
						<Link href='/'>
							<h1 className='font-medium'>Bru</h1>
						</Link>

						<button
							onClick={toggleMenu}
							className='p-2 focus:outline-none'
							aria-label='Toggle menu'
						>
							<div className='w-6 h-5 relative flex flex-col justify-between'>
								<span
									className={`w-full h-0.5 bg-zinc-600 dark:bg-zinc-400 transform transition-all duration-300 ${
										isMenuOpen ? 'rotate-45 translate-y-2' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-zinc-600 dark:bg-zinc-400 transition-all duration-300 ${
										isMenuOpen ? 'opacity-0' : ''
									}`}
								/>
								<span
									className={`w-full h-0.5 bg-zinc-600 dark:bg-zinc-400 transform transition-all duration-300 ${
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
