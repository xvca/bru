import { cn } from '@/lib/utils'

/*
  Empty states and loading skeletons: no cards, hairline rows matching the
  lists they stand in for, quiet ink-2 copy and at most one action.
*/

export function EmptyState({
	title,
	body,
	action,
	icon,
	className,
}: {
	title: string
	body?: React.ReactNode
	action?: React.ReactNode
	icon?: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-start border-t border-line pt-6 pb-4',
				className,
			)}
		>
			{icon ? <div className='mb-3 text-ink-2'>{icon}</div> : null}
			<div className='text-[17px] font-semibold'>{title}</div>
			{body ? (
				<p className='mt-1 max-w-[30ch] text-[14px] leading-5 text-ink-2'>
					{body}
				</p>
			) : null}
			{action ? <div className='mt-4'>{action}</div> : null}
		</div>
	)
}

function Bar({ className }: { className?: string }) {
	return <div className={cn('rounded-[3px] bg-line/70', className)} />
}

/** Placeholder rows matching the flat list rhythm */
export function RowSkeleton({
	rows = 4,
	variant = 'shot',
}: {
	rows?: number
	variant?: 'shot' | 'bean' | 'simple'
}) {
	return (
		<div aria-busy='true' aria-label='Loading' className='animate-pulse'>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					// eslint-disable-next-line react/no-array-index-key -- static placeholders
					key={i}
					className={cn(
						'flex items-start gap-3 py-4',
						i > 0 && 'border-t border-line',
					)}
				>
					<div className='flex flex-1 flex-col gap-2.5 pt-0.5'>
						<div className='flex items-center gap-2'>
							{variant !== 'simple' && (
								<span className='size-2.5 rounded-full bg-line' />
							)}
							<Bar className={cn('h-4', i % 2 ? 'w-32' : 'w-40')} />
						</div>
						<Bar
							className={cn('h-3', variant === 'simple' ? 'w-20' : 'w-48')}
						/>
						{variant !== 'simple' && <Bar className='h-3 w-28' />}
						{variant === 'bean' && <Bar className='mt-1.5 h-[3px] w-full' />}
					</div>
					{variant !== 'simple' && <Bar className='mt-0.5 h-5 w-12' />}
				</div>
			))}
		</div>
	)
}
