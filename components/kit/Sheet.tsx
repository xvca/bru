import { useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface SheetProps {
	open: boolean
	onClose: () => void
	title: string
	/** Optional description for screen readers and the hint line */
	description?: React.ReactNode
	/** Right side of the title row (Skip, Cancel) */
	action?: React.ReactNode
	children?: React.ReactNode
	/** Pinned below the scrolling body */
	footer?: React.ReactNode
	/** Hairline above the footer, for long scrolling forms */
	footerBorder?: boolean
	/** Tall sheets reach to just under the status bar; auto sheets hug content */
	size?: 'auto' | 'tall'
	role?: 'dialog' | 'alertdialog'
	onEscapeKeyDown?: (e: KeyboardEvent) => void
	className?: string
	bodyClassName?: string
}

/**
 * Bottom sheet: panel surface, 24px top radius, 40x4 grabber, scrim.
 * Drag the grabber/title row down to dismiss.
 */
export function Sheet({
	open,
	onClose,
	title,
	description,
	action,
	children,
	footer,
	footerBorder,
	size = 'auto',
	role = 'dialog',
	onEscapeKeyDown,
	className,
	bodyClassName,
}: SheetProps) {
	const [drag, setDrag] = useState(0)
	const [dragging, setDragging] = useState(false)
	const start = useRef<number | null>(null)

	const onPointerDown = (e: React.PointerEvent) => {
		if ((e.target as HTMLElement).closest('button, a, input')) return
		start.current = e.clientY
		setDragging(true)
		;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
	}
	const onPointerMove = (e: React.PointerEvent) => {
		if (start.current === null) return
		setDrag(Math.max(0, e.clientY - start.current))
	}
	const onPointerUp = () => {
		if (start.current === null) return
		start.current = null
		setDragging(false)
		if (drag > 90) onClose()
		setDrag(0)
	}

	return (
		<DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0' />
				<DialogPrimitive.Content
					role={role}
					{...(description ? {} : { 'aria-describedby': undefined })}
					onEscapeKeyDown={onEscapeKeyDown}
					onOpenAutoFocus={(e) => e.preventDefault()}
					style={{
						transform: drag ? `translateY(${drag}px)` : undefined,
						transition: dragging ? 'none' : 'transform .2s ease',
					}}
					className={cn(
						'fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-xl flex-col rounded-t-[24px] bg-panel text-ink shadow-[0_-12px_30px_-12px_var(--sh)] outline-none pb-safe',
						'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:duration-200 data-[state=open]:duration-300',
						size === 'tall'
							? 'top-[max(48px,calc(env(safe-area-inset-top)+8px+var(--ios-blur-gap)))]'
							: 'max-h-[calc(var(--app-h)-48px)]',
						className,
					)}
				>
					<div
						className='shrink-0 touch-none px-5 pt-2.5 select-none'
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
						onPointerCancel={onPointerUp}
					>
						<div className='mx-auto mb-1.5 h-1 w-10 rounded-full bg-line' />
						<div className='flex h-11 items-center justify-between gap-3'>
							<DialogPrimitive.Title className='truncate text-[22px] font-semibold'>
								{title}
							</DialogPrimitive.Title>
							{action}
						</div>
						{description ? (
							<DialogPrimitive.Description className='mt-1 mb-2 text-[13px] leading-[18px] text-ink-2'>
								{description}
							</DialogPrimitive.Description>
						) : null}
					</div>

					<div
						className={cn(
							'no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5',
							bodyClassName,
						)}
					>
						{children}
					</div>

					{footer ? (
						<div
							className={cn(
								'shrink-0 px-5 pt-3.5 pb-5',
								footerBorder && 'border-t border-line pt-2.5',
							)}
						>
							{footer}
						</div>
					) : null}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	)
}
