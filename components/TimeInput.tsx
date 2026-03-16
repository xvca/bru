import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface TimeInputProps {
	value: number | null
	onChange: (seconds: number | null) => void
	onBlur?: () => void
	id?: string
	placeholder?: string
}

export function TimeInput({
	value,
	onChange,
	onBlur,
	id,
	placeholder = '0:28',
}: TimeInputProps) {
	const totalSeconds = value || 0
	const [draftValue, setDraftValue] = useState<string | null>(null)

	const formattedValue =
		totalSeconds > 0
			? `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60)
					.toString()
					.padStart(2, '0')}`
			: ''

	const displayValue = draftValue ?? formattedValue

	const parseTimeInput = (input: string): number => {
		const digits = input.replace(/\D/g, '')
		if (!digits) return 0

		if (digits.length <= 2) {
			return parseInt(digits, 10)
		}

		const secs = parseInt(digits.slice(-2), 10)
		const mins = parseInt(digits.slice(0, -2), 10)
		return mins * 60 + secs
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value
		setDraftValue(input)

		const totalSecs = parseTimeInput(input)
		onChange(totalSecs > 0 ? totalSecs : null)
	}

	const handleBlur = () => {
		setDraftValue(null)
		onBlur?.()
	}

	return (
		<Input
			id={id}
			type='text'
			inputMode='numeric'
			value={displayValue}
			onChange={handleChange}
			onBlur={handleBlur}
			onFocus={(e) => e.target.select()}
			placeholder={placeholder}
			enterKeyHint='next'
		/>
	)
}
