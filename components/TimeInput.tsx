import { useState, useEffect } from 'react'
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
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60

	const [displayValue, setDisplayValue] = useState(
		totalSeconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '',
	)

	useEffect(() => {
		if (totalSeconds > 0) {
			const mins = Math.floor(totalSeconds / 60)
			const secs = totalSeconds % 60
			setDisplayValue(`${mins}:${secs.toString().padStart(2, '0')}`)
		} else {
			setDisplayValue('')
		}
	}, [totalSeconds])

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
		setDisplayValue(input)

		const totalSecs = parseTimeInput(input)
		onChange(totalSecs > 0 ? totalSecs : null)
	}

	const handleBlur = () => {
		const totalSecs = value || 0
		if (totalSecs > 0) {
			const mins = Math.floor(totalSecs / 60)
			const secs = totalSecs % 60
			setDisplayValue(`${mins}:${secs.toString().padStart(2, '0')}`)
		} else {
			setDisplayValue('')
		}
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
