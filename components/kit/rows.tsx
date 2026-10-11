import { forwardRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronIcon } from './icons'

/** Section heading inside a scrolling screen (Device, Presets, ...) */
export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'mt-[30px] mb-1 text-[13px] font-semibold text-ink-2',
				className,
			)}
		>
			{children}
		</div>
	)
}

export function Hint({
	children,
	className,
	id,
}: {
	children: React.ReactNode
	className?: string
	id?: string
}) {
	return (
		<div
			id={id}
			className={cn('mt-1.5 text-[13px] leading-[18px] text-ink-2', className)}
		>
			{children}
		</div>
	)
}

interface ValueRowProps {
	title: React.ReactNode
	hint?: React.ReactNode
	/** Chevron direction: down opens a picker, right navigates */
	chevron?: 'down' | 'right' | 'none'
	first?: boolean
	href?: string
	className?: string
	children?: React.ReactNode
}

const valueRowClass = (first?: boolean, className?: string) =>
	cn(
		'flex min-h-14 w-full items-center justify-between gap-3 py-1.5 text-left text-ink outline-offset-[-2px] disabled:opacity-50',
		!first && 'border-t border-line',
		className,
	)

function ValueRowInner({
	title,
	hint,
	chevron = 'right',
	children,
}: ValueRowProps) {
	return (
		<>
			<span className='flex min-w-0 flex-col gap-0.5'>
				<span className='text-[16px] font-medium'>{title}</span>
				{hint ? (
					<span className='text-[13px] leading-[18px] text-ink-2'>{hint}</span>
				) : null}
			</span>
			{children}
			{chevron !== 'none' && (
				<ChevronIcon dir={chevron} className='shrink-0 text-ink-2' />
			)}
		</>
	)
}

/** Tappable row with title, hint and chevron (Timezone, Shot history, ...) */
export const ValueRow = forwardRef<
	HTMLButtonElement,
	ValueRowProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'>
>(
	(
		{ title, hint, chevron, first, href, className, children, ...props },
		ref,
	) => {
		if (href) {
			return (
				<Link href={href} className={valueRowClass(first, className)}>
					<ValueRowInner title={title} hint={hint} chevron={chevron}>
						{children}
					</ValueRowInner>
				</Link>
			)
		}
		return (
			<button
				ref={ref}
				type='button'
				className={valueRowClass(first, className)}
				{...props}
			>
				<ValueRowInner title={title} hint={hint} chevron={chevron}>
					{children}
				</ValueRowInner>
			</button>
		)
	},
)
ValueRow.displayName = 'ValueRow'

/** Underlined-tab segmented control (Brewers / Grinders, Single / Double) */
export function SegTabs<T extends string>({
	value,
	options,
	onChange,
	className,
}: {
	value: T
	options: { value: T; label: string }[]
	onChange: (v: T) => void
	className?: string
}) {
	return (
		<div
			role='tablist'
			className={cn('flex gap-6 border-b border-line', className)}
		>
			{options.map((o) => {
				const on = o.value === value
				return (
					<button
						key={o.value}
						type='button'
						role='tab'
						aria-selected={on}
						onClick={() => onChange(o.value)}
						className={cn(
							'h-11 px-1 text-[16px] font-semibold outline-offset-[-2px] transition-colors',
							on ? 'text-ink shadow-[0_2px_0_var(--accent)]' : 'text-ink-2',
						)}
					>
						{o.label}
					</button>
				)
			})}
		</div>
	)
}

/** Sentence-case field label stacked over its input */
export function FormField({
	label,
	htmlFor,
	error,
	children,
	className,
	optional,
}: {
	label: React.ReactNode
	htmlFor?: string
	error?: string
	children: React.ReactNode
	className?: string
	optional?: boolean
}) {
	return (
		<div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
			<label htmlFor={htmlFor} className='text-[12.5px] text-ink-2'>
				{label}
				{optional && <span className='opacity-70'> (optional)</span>}
			</label>
			{children}
			{error ? (
				<span role='alert' className='mt-1 text-[12.5px] text-danger'>
					{error}
				</span>
			) : null}
		</div>
	)
}

/** Batch swatch dot */
export function Swatch({ color, size = 10 }: { color: string; size?: number }) {
	return (
		<span
			aria-hidden
			className='shrink-0 rounded-full'
			style={{ width: size, height: size, background: color }}
		/>
	)
}

/** Status dot used for connection / enabled states */
export function StatusDot({
	tone,
	size = 7,
	pulse,
}: {
	tone: 'green' | 'ink2' | 'danger' | 'warning'
	size?: number
	pulse?: boolean
}) {
	const bg = {
		green: 'var(--green)',
		ink2: 'var(--ink-2)',
		danger: 'var(--danger)',
		warning: 'var(--warning)',
	}[tone]
	return (
		<span
			aria-hidden
			className={cn('shrink-0 rounded-full', pulse && 'animate-pulse')}
			style={{ width: size, height: size, background: bg }}
		/>
	)
}
