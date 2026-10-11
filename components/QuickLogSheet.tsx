import { useState } from 'react'
import { Sheet } from '@/components/kit/Sheet'
import { Key, NeutralKey, TextButton } from '@/components/kit/buttons'
import type { BrewFormData } from '@/lib/validators'

interface QuickLogSheetProps {
	open: boolean
	beanName: string
	draft: Partial<BrewFormData> | null
	onSkip: () => void
	onEdit: () => void
	onSave: () => Promise<void>
}

const fmt = (n: number | null | undefined, unit = '', digits = 1) =>
	n === null || n === undefined || !Number.isFinite(n)
		? '–'
		: `${n.toFixed(digits)}${unit}`

/**
 * After a shot with a recipe picked: confirm the numbers and save in one tap,
 * open the full form with Edit, or Skip.
 */
export function QuickLogSheet({
	open,
	beanName,
	draft,
	onSkip,
	onEdit,
	onSave,
}: QuickLogSheetProps) {
	const [isSaving, setIsSaving] = useState(false)

	const rows: [string, string][] = [
		['Bean', beanName],
		['Dose', fmt(draft?.doseWeight, ' g')],
		['Yield', fmt(draft?.yieldWeight, ' g')],
		['Time', fmt(draft?.brewTime, ' s', 0)],
		['Temp', fmt(draft?.waterTemperature, ' °C', 0)],
		['Grind', fmt(draft?.grindSize)],
	]

	const save = async () => {
		setIsSaving(true)
		try {
			await onSave()
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Sheet
			open={open}
			onClose={onSkip}
			title='Log this shot'
			action={
				<TextButton mono onClick={onSkip} className='-mr-1 px-[18px]'>
					Skip
				</TextButton>
			}
			footer={
				<div className='flex items-center gap-3 pb-1.5'>
					<NeutralKey onClick={onEdit}>Edit</NeutralKey>
					<Key onClick={save} disabled={isSaving} className='flex-1'>
						{isSaving ? 'Saving…' : 'Save shot'}
					</Key>
				</div>
			}
		>
			<dl className='pt-1.5'>
				{rows.map(([k, v]) => (
					<div
						key={k}
						className='flex h-11 items-center justify-between gap-4 border-t border-line'
					>
						<dt className='lbl'>{k}</dt>
						<dd className='truncate font-mono text-[16px] font-medium'>{v}</dd>
					</div>
				))}
			</dl>
		</Sheet>
	)
}
