import { format } from 'date-fns'
import type { Bean } from '@/generated/prisma/client'
import { beanColor } from '@/lib/beanColor'
import { PickerSheet, type PickerOption } from '@/components/kit/Picker'

const byBatch = (a: Bean, b: Bean) =>
	a.batchId !== b.batchId
		? (a.batchId || '').localeCompare(b.batchId || '')
		: b.id - a.id

/** Open bags then frozen ones; finished bags only if currently selected */
function beanOptions(
	beans: Bean[],
	selectedId?: number | null,
): PickerOption<number>[] {
	const available = beans.filter(
		(b) =>
			b.remainingWeight === null ||
			b.remainingWeight > 0 ||
			b.id === selectedId,
	)
	const isFrozen = (b: Bean) => !!b.freezeDate && !b.thawDate
	const left = (b: Bean) =>
		b.remainingWeight === null ? null : `${b.remainingWeight} g left`

	const open = available
		.filter((b) => !isFrozen(b))
		.sort(byBatch)
		.map((b) => ({
			value: b.id,
			label: b.name,
			sub: [b.roaster, format(new Date(b.roastDate), 'd MMM'), left(b)]
				.filter(Boolean)
				.join(' · '),
			swatch: beanColor(b),
			group: 'Open bags',
		}))

	const frozen = available
		.filter(isFrozen)
		.sort(byBatch)
		.map((b) => ({
			value: b.id,
			label: b.name,
			sub: [
				b.freezeDate && `Frozen ${format(new Date(b.freezeDate), 'd MMM')}`,
				left(b),
			]
				.filter(Boolean)
				.join(' · '),
			swatch: beanColor(b),
			group: 'Frozen',
			muted: true,
		}))

	return [...open, ...frozen]
}

export function BeanPicker({
	open,
	onClose,
	beans,
	value,
	onChange,
	title = 'Bean',
}: {
	open: boolean
	onClose: () => void
	beans: Bean[]
	value: number | null | undefined
	onChange: (id: number) => void
	title?: string
}) {
	return (
		<PickerSheet
			open={open}
			onClose={onClose}
			title={title}
			size='tall'
			options={beanOptions(beans, value)}
			value={value}
			onChange={onChange}
			empty='No beans yet. Add a bag on the Beans tab first.'
		/>
	)
}
