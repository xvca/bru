import { cn } from '@/lib/utils'
import { Sheet } from './Sheet'
import { TextButton } from './buttons'
import { CheckIcon } from './icons'
import { Swatch } from './rows'

export interface PickerOption<T extends string | number> {
	value: T
	label: React.ReactNode
	sub?: React.ReactNode
	swatch?: string
	group?: string
	muted?: boolean
}

/** One selectable row: swatch, title, sub line, accent check when chosen */
export function OptionRow({
	label,
	sub,
	swatch,
	selected,
	muted,
	first,
	onClick,
}: {
	label: React.ReactNode
	sub?: React.ReactNode
	swatch?: string
	selected: boolean
	muted?: boolean
	first?: boolean
	onClick: () => void
}) {
	return (
		<button
			type='button'
			role='option'
			aria-selected={selected}
			onClick={onClick}
			className={cn(
				'flex min-h-14 w-full items-center gap-3 py-2 text-left outline-offset-[-2px]',
				!first && 'border-t border-line',
				muted && 'opacity-70',
			)}
		>
			{swatch ? <Swatch color={swatch} /> : null}
			<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='truncate text-[16px] font-medium'>{label}</span>
				{sub ? (
					<span className='truncate text-[13px] leading-[18px] text-ink-2'>
						{sub}
					</span>
				) : null}
			</span>
			<CheckIcon
				size={16}
				className={cn('shrink-0 text-accent', !selected && 'invisible')}
			/>
		</button>
	)
}

interface PickerSheetProps<T extends string | number> {
	open: boolean
	onClose: () => void
	title: string
	description?: React.ReactNode
	options: PickerOption<T>[]
	value: T | null | undefined
	onChange: (value: T) => void
	empty?: React.ReactNode
	size?: 'auto' | 'tall'
}

/** Single choice list in a bottom sheet; picking closes it */
export function PickerSheet<T extends string | number>({
	open,
	onClose,
	title,
	description,
	options,
	value,
	onChange,
	empty,
	size = 'auto',
}: PickerSheetProps<T>) {
	const groups: { name?: string; items: PickerOption<T>[] }[] = []
	for (const o of options) {
		const last = groups.at(-1)
		if (last && last.name === o.group) last.items.push(o)
		else groups.push({ name: o.group, items: [o] })
	}

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title={title}
			description={description}
			size={size}
			action={
				<TextButton underline onClick={onClose} className='-mr-1 text-[13px]'>
					Done
				</TextButton>
			}
			bodyClassName='pb-6'
		>
			{options.length === 0 ? (
				<div className='py-4 text-[14px] text-ink-2'>{empty}</div>
			) : (
				<div role='listbox' aria-label={title}>
					{groups.map((g, gi) => (
						<div key={g.name ?? gi}>
							{g.name ? (
								<div className='mt-4 mb-1 text-[13px] font-semibold text-ink-2'>
									{g.name}
								</div>
							) : null}
							{g.items.map((o, i) => (
								<OptionRow
									key={String(o.value)}
									label={o.label}
									sub={o.sub}
									swatch={o.swatch}
									muted={o.muted}
									first={i === 0}
									selected={o.value === value}
									onClick={() => {
										onChange(o.value)
										onClose()
									}}
								/>
							))}
						</div>
					))}
				</div>
			)}
		</Sheet>
	)
}
