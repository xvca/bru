import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { differenceInCalendarDays, differenceInMinutes, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useSuggestions, type SmartSuggestion } from '@/hooks/useSuggestions'
import { CheckIcon } from '@/components/kit/icons'

interface RecipeChipsProps {
	selectedBeanId: number | null
	onToggle: (bean: SmartSuggestion, nextSelected: boolean) => void
	className?: string
}

const isDecaf = (s: SmartSuggestion) =>
	s.name.toLowerCase().includes('decaf') ||
	(s.roaster?.toLowerCase().includes('decaf') ?? false)

const formatAgo = (date: Date | string, now = new Date()) => {
	const d = new Date(date)
	const mins = differenceInMinutes(now, d)
	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins} min ago`
	const days = differenceInCalendarDays(now, d)
	if (days === 0) return `${Math.floor(mins / 60)} h ago`
	if (days === 1) return 'Yesterday'
	if (days < 7) return format(d, 'EEE')
	return format(d, 'd MMM')
}

const fmt1 = (n: number | null | undefined) =>
	n === null || n === undefined ? '–' : n.toFixed(1)

/**
 * "Brewed before": the last espresso for each active bean, as flat columns
 * divided by hairlines. Selected gets a 2px accent underline. With two or
 * fewer they stretch to fill the row; with more they scroll and snap.
 */
export function RecipeChips({
	selectedBeanId,
	onToggle,
	className,
}: RecipeChipsProps) {
	const { suggestions: raw, decafStartHour, isLoading } = useSuggestions()

	const suggestions = useMemo(() => {
		const hour = new Date().getHours()
		const isEvening = decafStartHour !== -1 && hour >= decafStartHour
		// Decaf first in the evening, last during the day
		return [...raw]
			.filter((s) => s.lastBrew)
			.sort((a, b) => {
				const da = isDecaf(a)
				const db = isDecaf(b)
				if (da === db) return 0
				return (da ? -1 : 1) * (isEvening ? 1 : -1)
			})
	}, [raw, decafStartHour])

	// Collapse smoothly when there turns out to be nothing to show (no beans
	// with a brew yet, or the request failed), so the controls glide down
	// instead of jumping
	const show = isLoading || suggestions.length > 0

	return (
		<AnimatePresence initial={false}>
			{show && (
				<motion.div
					key='recipes'
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: 'auto', opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
					// Bleed to the right edge inside the clip so the row can still scroll
					className='-mr-5 overflow-hidden pr-5'
				>
					{isLoading ? (
						<RecipesSkeleton className={className} />
					) : (
						<RecipeRow
							suggestions={suggestions}
							selectedBeanId={selectedBeanId}
							onToggle={onToggle}
							className={className}
						/>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function RecipesSkeleton({ className }: { className?: string }) {
	return (
		<div className={className}>
			<div className='lbl text-[10px]'>Brewed before</div>
			<div
				aria-busy='true'
				aria-label='Loading recipes'
				className='mt-2 flex h-32 animate-pulse'
			>
				{[0, 1].map((i) => (
					<div
						key={i}
						className={cn(
							'flex flex-1 flex-col gap-2 py-3',
							i ? 'border-l border-line px-3.5' : 'pr-3.5',
						)}
					>
						<div className='h-4 w-28 rounded-[3px] bg-line/70' />
						<div className='h-3 w-24 rounded-[3px] bg-line/70' />
						<div className='h-3 w-20 rounded-[3px] bg-line/70' />
					</div>
				))}
			</div>
		</div>
	)
}

function RecipeRow({
	suggestions,
	selectedBeanId,
	onToggle,
	className,
}: Omit<RecipeChipsProps, 'className'> & {
	suggestions: SmartSuggestion[]
	className?: string
}) {
	const few = suggestions.length <= 2

	return (
		<div className={className}>
			<div className='lbl text-[10px]'>Brewed before</div>
			<div
				className={cn(
					'no-scrollbar mt-2 -mr-5 flex snap-x snap-mandatory overflow-x-auto pr-5',
				)}
			>
				{suggestions.map((s, i) => {
					const b = s.lastBrew
					const selected = s.id === selectedBeanId
					const meta = [
						b.grindSize !== null ? `Grind ${fmt1(b.grindSize)}` : null,
						b.waterTemperature !== null ? `${b.waterTemperature}°C` : null,
					]
						.filter(Boolean)
						.join(' · ')

					return (
						<button
							key={s.id}
							type='button'
							aria-pressed={selected}
							onClick={() => onToggle(s, !selected)}
							className={cn(
								'relative flex min-h-32 snap-start flex-col items-start gap-[3px] pt-3 pb-3.5 text-left text-ink outline-offset-[-2px] transition-shadow',
								few ? 'min-w-0 flex-1' : 'w-[164px] shrink-0',
								i === 0 ? 'pr-3.5' : 'border-l border-line px-3.5',
								selected && 'shadow-[inset_0_-2px_0_var(--accent)]',
							)}
						>
							<span className='w-full truncate pr-4 text-[14px] font-semibold'>
								{s.name}
							</span>
							{meta && (
								<span className='font-mono text-[10.5px] tracking-[0.03em] whitespace-nowrap text-ink-2'>
									{meta}
								</span>
							)}
							<span className='font-mono text-[10.5px] tracking-[0.03em] whitespace-nowrap text-ink-2'>
								{fmt1(b.doseWeight)} → {fmt1(b.yieldWeight)} g
							</span>
							{b.notes ? (
								<span className='mt-[3px] line-clamp-2 text-[12px] leading-4 text-ink-2'>
									{b.notes}
								</span>
							) : null}
							<span className='mt-auto font-mono text-[10px] tracking-[0.08em] text-ink-2 uppercase'>
								{formatAgo(b.createdAt)}
							</span>
							{selected && (
								<CheckIcon
									className={cn(
										'absolute top-3 text-accent',
										i === 0 ? 'right-3.5' : 'right-3.5',
									)}
								/>
							)}
						</button>
					)
				})}
			</div>
		</div>
	)
}
