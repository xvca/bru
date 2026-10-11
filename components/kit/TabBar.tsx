import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import { BeanIcon, DialIcon, ListIcon, MachineIcon, SlidersIcon } from './icons'

const isLiteMode = process.env.NEXT_PUBLIC_LITE === 'true'

const TABS = [
	{ label: 'Brew', href: '/', icon: DialIcon, match: ['/'] },
	...(!isLiteMode
		? [
				{ label: 'Shots', href: '/brews', icon: ListIcon, match: ['/brews'] },
				{ label: 'Beans', href: '/beans', icon: BeanIcon, match: ['/beans'] },
			]
		: []),
	...(!isLiteMode
		? [
				{
					label: 'Gear',
					href: '/equipment',
					icon: MachineIcon,
					match: ['/equipment'],
				},
			]
		: []),
	{
		label: 'Settings',
		href: '/settings',
		icon: SlidersIcon,
		match: ['/settings', '/settings/history'],
	},
]

export function TabBar() {
	const { pathname } = useRouter()

	return (
		<nav
			aria-label='Primary'
			className='fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel pb-(--tabbar-pad) px-safe'
		>
			<div className='mx-auto flex h-16 max-w-xl'>
				{TABS.map(({ label, href, icon: Icon, match }) => {
					const active = match.includes(pathname)
					return (
						<Link
							key={label}
							href={href}
							aria-current={active ? 'page' : undefined}
							className={cn(
								'relative flex flex-1 flex-col items-center justify-center gap-[5px] outline-offset-[-4px] transition-colors',
								active ? 'text-ink' : 'text-ink-2',
							)}
						>
							{active && (
								// Shared layoutId: the bar slides from the old tab to the new one
								<motion.span
									layoutId='tab-indicator'
									transition={{ type: 'spring', stiffness: 500, damping: 40 }}
									className='absolute inset-x-0 top-0 mx-auto h-[3px] w-7 rounded-b-[2px] bg-accent'
								/>
							)}
							<Icon />
							<span className='lbl text-[10px]' style={{ color: 'inherit' }}>
								{label}
							</span>
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
