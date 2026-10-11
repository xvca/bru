import { useState, useEffect } from 'react'

interface TimeInputProps {
	value: number | null
	onChange: (seconds: number | null) => void
	onBlur?: () => void
	id?: string
	placeholder?: string
	className?: string
	'aria-label'?: string
}

const format = (total: number) =>
	`${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`

/** m:ss entry; digits only, the last two are seconds */
export function TimeInput({
	value,
	onChange,
	onBlur,
	id,
	placeholder = '0:28',
	className,
	...rest
}: TimeInputProps) {
	const totalSeconds = value || 0

	const [displayValue, setDisplayValue] = useState(
		totalSeconds > 0 ? format(totalSeconds) : '',
	)

	useEffect(() => {
		setDisplayValue(totalSeconds > 0 ? format(totalSeconds) : '')
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
		setDisplayValue(totalSecs > 0 ? format(totalSecs) : '')
		onBlur?.()
	}

	return (
		<input
			id={id}
			type='text'
			inputMode='numeric'
			value={displayValue}
			onChange={handleChange}
			onBlur={handleBlur}
			onFocus={(e) => e.target.select()}
			placeholder={placeholder}
			enterKeyHint='next'
			className={className}
			aria-label={rest['aria-label']}
		/>
	)
}
