import { forwardRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PlusIcon } from './icons'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

/** 44px square icon button, no chrome */
export const IconButton = forwardRef<
	HTMLButtonElement,
	ButtonProps & { pressed?: boolean }
>(({ className, pressed, ...props }, ref) => (
	<button
		ref={ref}
		type='button'
		aria-pressed={pressed}
		className={cn(
			'flex size-11 shrink-0 items-center justify-center rounded-xl text-ink outline-offset-[-2px] transition-colors disabled:opacity-40',
			pressed && 'bg-well',
			className,
		)}
		{...props}
	/>
))
IconButton.displayName = 'IconButton'

/** Small raised accent key with a plus, for page headers */
export const AddKey = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, ...props }, ref) => (
		<button
			ref={ref}
			type='button'
			className={cn('addkey mx-1 mb-[3px] outline-offset-[3px]', className)}
			{...props}
		>
			<PlusIcon />
		</button>
	),
)
AddKey.displayName = 'AddKey'

/**
 * Underlined text action. `mono` is the uppercase DM Mono variant, used only
 * on the dial screen (Skip on the quick log sheet).
 */
export const TextButton = forwardRef<
	HTMLButtonElement,
	ButtonProps & {
		mono?: boolean
		underline?: boolean
		tone?: 'ink' | 'ink2' | 'accent' | 'danger'
	}
>(({ className, mono, underline, tone = 'ink', ...props }, ref) => (
	<button
		ref={ref}
		type='button'
		className={cn(
			'flex min-h-11 items-center gap-1.5 px-1 outline-offset-[-2px] disabled:opacity-40',
			mono
				? 'lbl text-[11px] underline underline-offset-4'
				: 'text-[14px] font-semibold',
			underline && 'underline underline-offset-4',
			tone === 'ink' && 'text-ink!',
			tone === 'ink2' && 'text-ink-2!',
			tone === 'accent' && 'text-accent!',
			tone === 'danger' && 'text-danger!',
			className,
		)}
		{...props}
	/>
))
TextButton.displayName = 'TextButton'

/** Raised neutral key: Edit link, Cancel in sheets, Disable */
export const NeutralKey = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, ...props }, ref) => (
		<button
			ref={ref}
			type='button'
			className={cn(
				'skey h-14 shrink-0 rounded-[20px] px-[22px] text-[15px] font-semibold tracking-[0.1em] uppercase outline-offset-[3px]',
				className,
			)}
			{...props}
		/>
	),
)
NeutralKey.displayName = 'NeutralKey'

/** Large raised accent key; wraps itself so the 6px edge never clips */
export const Key = forwardRef<
	HTMLButtonElement,
	ButtonProps & { tone?: 'accent' | 'ink' | 'danger'; size?: 'lg' | 'md' }
>(
	(
		{ className, tone = 'accent', size = 'md', type = 'button', ...props },
		ref,
	) => (
		<button
			ref={ref}
			type={type}
			className={cn(
				'key',
				size === 'lg' ? 'h-16 text-[18px]' : 'h-14 text-[17px]',
				tone === 'ink' && 'key-ink',
				tone === 'danger' && 'key-danger',
				className,
			)}
			{...props}
		/>
	),
)
Key.displayName = 'Key'

/** Flat pill chip used for filters and roast level */
export const Chip = forwardRef<
	HTMLButtonElement,
	ButtonProps & { on?: boolean; size?: 'md' | 'sm' }
>(({ className, on, size = 'md', ...props }, ref) => (
	<button
		ref={ref}
		type='button'
		aria-pressed={on}
		className={cn(
			'flex shrink-0 items-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors',
			size === 'md'
				? 'h-10 px-4 text-[14px]'
				: 'h-[34px] px-[13px] text-[13px]',
			on ? 'bg-ink text-bg' : 'text-ink shadow-[inset_0_0_0_1px_var(--line)]',
			className,
		)}
		{...props}
	/>
))
Chip.displayName = 'Chip'

export function BackLink({
	href,
	children,
}: {
	href: string
	children: React.ReactNode
}) {
	return (
		<Link
			href={href}
			className='-ml-2 flex min-h-11 items-center gap-0.5 px-1 text-[15px] font-semibold text-ink-2 outline-offset-[-2px]'
		>
			<svg
				width='20'
				height='20'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
				strokeLinejoin='round'
				aria-hidden
			>
				<path d='M15 6l-6 6 6 6' />
			</svg>
			{children}
		</Link>
	)
}
