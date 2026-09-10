import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from './ui/button'
import {
	Sheet,
	SheetTitle,
	SheetContent,
	SheetTrigger,
} from '@/components/ui/sheet'

const isLiteMode = process.env.NEXT_PUBLIC_LITE === 'true'
const links = [
	{ label: 'Autobru', href: '/' },
	...(!isLiteMode
		? [
				{ label: 'Beans', href: '/beans' },
				{ label: 'Brews', href: '/brews' },
				{ label: 'Equipment', href: '/equipment' },
			]
		: []),
	{ label: 'Settings', href: '/settings' },
]

const Appbar = () => {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div className='fixed top-0 left-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-border pt-safe'>
			<header className='px-safe'>
				<div className='mx-auto flex h-14 max-w-(--breakpoint-md) items-center justify-between px-4'>
					<Link href='/' className='font-bold text-xl'>
						Bru
					</Link>

					<Sheet open={isOpen} onOpenChange={setIsOpen}>
						<SheetTrigger asChild>
							<Button variant='ghost' size='icon'>
								<Menu className='h-5 w-5' />
								<span className='sr-only'>Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side='top' aria-describedby=''>
							<SheetTitle className='sr-only'>Menu</SheetTitle>
							<nav className='flex flex-col gap-2 mt-4 sm:mt-0'>
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
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</header>
		</div>
	)
}

export default Appbar
