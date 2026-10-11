import { DayPicker } from 'react-day-picker'
import { format, isSameDay, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Sheet } from './Sheet'
import { Chip, TextButton } from './buttons'
import { ChevronIcon } from './icons'

/*
  A month grid in a bottom sheet, with quick chips for the common cases.
  Picking a day closes it.
*/

interface DatePickerSheetProps {
	open: boolean
	onClose: () => void
	title: string
	value: Date | undefined
	onChange: (date: Date | undefined) => void
	/** Offer a "Not frozen"-style clear chip */
	clearLabel?: string
	disabled?: (date: Date) => boolean
}

export function DatePickerSheet({
	open,
	onClose,
	title,
	value,
	onChange,
	clearLabel,
	disabled,
}: DatePickerSheetProps) {
	const today = new Date()
	const pick = (d: Date | undefined) => {
		onChange(d)
		onClose()
	}
	const quick = [
		{ label: 'Today', date: today },
		{ label: 'Yesterday', date: subDays(today, 1) },
	].filter((q) => !disabled?.(q.date))

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title={title}
			action={
				<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
					Done
				</TextButton>
			}
			bodyClassName='pb-6'
		>
			<div className='flex flex-wrap gap-2 pt-1 pb-3'>
				{quick.map((q) => (
					<Chip
						key={q.label}
						size='sm'
						on={!!value && isSameDay(value, q.date)}
						onClick={() => pick(q.date)}
					>
						{q.label}
					</Chip>
				))}
				{clearLabel && (
					<Chip size='sm' on={!value} onClick={() => pick(undefined)}>
						{clearLabel}
					</Chip>
				)}
			</div>

			<DayPicker
				mode='single'
				selected={value}
				onSelect={(d) => d && pick(d)}
				defaultMonth={value ?? today}
				disabled={disabled}
				weekStartsOn={1}
				fixedWeeks
				showOutsideDays
				formatters={{
					formatCaption: (d) => format(d, 'MMMM yyyy'),
					formatWeekdayName: (d) => format(d, 'EEEEE'),
				}}
				classNames={{
					root: 'relative border-t border-line pt-2',
					months: 'relative',
					month: 'w-full',
					month_caption: 'flex h-11 items-center',
					caption_label: 'text-[17px] font-semibold',
					nav: 'absolute top-0 right-0 z-10 flex',
					button_previous:
						'flex size-11 items-center justify-center rounded-xl text-ink outline-offset-[-2px] disabled:opacity-30',
					button_next:
						'-mr-2.5 flex size-11 items-center justify-center rounded-xl text-ink outline-offset-[-2px] disabled:opacity-30',
					month_grid: 'mt-1 w-full border-collapse',
					weekdays: 'flex',
					weekday:
						'flex h-8 flex-1 items-center justify-center font-mono text-[11px] font-normal text-ink-2',
					weeks: '',
					week: 'flex',
					day: 'flex h-11 flex-1 items-center justify-center p-0',
					day_button: cn(
						'flex size-10 items-center justify-center rounded-full font-mono text-[15px] font-medium outline-offset-[-2px] transition-colors',
					),
					selected: '[&>button]:bg-accent [&>button]:text-on-accent',
					today: '[&>button]:shadow-[inset_0_0_0_1.5px_var(--line)]',
					outside: 'text-ink-2/50',
					disabled: 'opacity-30',
					hidden: 'invisible',
				}}
				components={{
					Chevron: ({ orientation }) => (
						<ChevronIcon
							dir={orientation === 'left' ? 'left' : 'right'}
							size={20}
						/>
					),
				}}
			/>
		</Sheet>
	)
}

/** Underlined date field that opens the sheet */
export function DateField({
	value,
	placeholder,
	onClick,
	id,
	invalid,
}: {
	value: Date | undefined
	placeholder: string
	onClick: () => void
	id?: string
	invalid?: boolean
}) {
	return (
		<button
			id={id}
			type='button'
			onClick={onClick}
			className={cn(
				'flex h-11 w-full items-center justify-between border-b-[1.5px] border-line text-left outline-offset-2',
				value
					? 'font-mono text-[17px] font-medium text-ink'
					: 'text-[17px] text-ink-2 opacity-80',
				invalid && 'border-danger',
			)}
		>
			<span>{value ? format(value, 'd MMM yyyy') : placeholder}</span>
			<svg
				width='18'
				height='18'
				viewBox='0 0 24 24'
				fill='none'
				stroke='var(--ink-2)'
				strokeWidth='1.8'
				strokeLinecap='round'
				strokeLinejoin='round'
				aria-hidden
			>
				<rect x='4' y='5.5' width='16' height='14.5' rx='2.5' />
				<path d='M4 10h16M8.5 3.5v4M15.5 3.5v4' />
			</svg>
		</button>
	)
}
