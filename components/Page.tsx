import Head from 'next/head'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface Props {
	title?: string
	children: React.ReactNode
	/** Fill the viewport above the tab bar without scrolling (Brew screen) */
	fill?: boolean
	className?: string
}

const Page = ({ title, children, fill, className }: Props) => {
	const { resolvedTheme } = useTheme()

	return (
		<>
			<Head>
				{title ? <title>{`Bru | ${title}`}</title> : null}
				<meta
					key='theme-color'
					name='theme-color'
					content={resolvedTheme === 'dark' ? '#14110F' : '#E9E4DA'}
				/>
			</Head>

			<main
				className={cn(
					'mx-auto flex w-full max-w-xl flex-col pt-[calc(env(safe-area-inset-top)+var(--ios-blur-gap))] px-safe',
					fill
						? 'h-[calc(var(--app-h)-var(--tabbar-h))] overflow-hidden'
						: 'min-h-(--app-h) pb-[calc(var(--tabbar-h)+1.5rem)]',
					className,
				)}
			>
				{children}
			</main>
		</>
	)
}

export default Page

interface HeaderProps {
	title: string
	actions?: React.ReactNode
	/** Back link shown above the title, for nested screens (Shot history) */
	back?: React.ReactNode
}

export function PageHeader({ title, actions, back }: HeaderProps) {
	if (back) {
		return (
			<header className='shrink-0'>
				<div className='flex h-16 items-center justify-between pt-2.5 pr-2 pl-5'>
					{back}
					<div className='flex items-center gap-0.5'>{actions}</div>
				</div>
				<h1 className='px-5 pb-1.5 text-[28px] font-semibold tracking-[-0.01em]'>
					{title}
				</h1>
			</header>
		)
	}

	return (
		<header className='flex h-16 shrink-0 items-center justify-between pt-2.5 pr-2 pl-5'>
			<h1 className='text-[28px] font-semibold tracking-[-0.01em]'>{title}</h1>
			<div className='flex items-center gap-0.5'>{actions}</div>
		</header>
	)
}
