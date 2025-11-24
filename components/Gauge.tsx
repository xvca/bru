import React, { useState, useEffect, useRef } from 'react'

interface GaugeProps {
	max: number
	value: number
	min: number
	arcSize: number
	gaugePrimaryColor: string
	gaugePrimaryEndColor?: string
	gaugeSecondaryColor: string
	className?: string
}

/**
 * Custom Hook: Smooths out value changes using Linear Interpolation (Lerp).
 * @param value The target value to animate to
 * @param speed The friction factor (0.0 - 1.0). Higher = faster, Lower = smoother/slower.
 */
const useProgressiveValue = (targetValue: number, speed = 0.15) => {
	const [value, setValue] = useState(targetValue)
	const requestRef = useRef<number>(0)
	const previousValueRef = useRef<number>(targetValue)

	useEffect(() => {
		const animate = () => {
			setValue((prev) => {
				const diff = targetValue - prev

				if (Math.abs(diff) < 0.05) {
					previousValueRef.current = targetValue
					return targetValue
				}

				const nextValue = prev + diff * speed
				previousValueRef.current = nextValue
				return nextValue
			})

			requestRef.current = requestAnimationFrame(animate)
		}

		if (previousValueRef.current !== targetValue) {
			requestRef.current = requestAnimationFrame(animate)
		}

		return () => cancelAnimationFrame(requestRef.current)
	}, [targetValue, speed])

	return value
}

export function Gauge({
	max = 100,
	min = 0,
	value = 0,
	arcSize = 250,
	gaugePrimaryColor,
	gaugePrimaryEndColor = '',
	gaugeSecondaryColor,
	className,
}: GaugeProps) {
	const smoothValue = useProgressiveValue(value, 0.1)

	arcSize = Math.min(Math.max(arcSize, 180), 360)

	const currentPercent = ((smoothValue - min) / (max - min)) * 100

	const radius = 48
	const center = { x: 50, y: 55 }
	const angleOffset = 270 - arcSize
	const circumference = (arcSize / 360) * (2 * Math.PI * radius)

	const getCurrentColor = () => {
		if (!gaugePrimaryEndColor) return gaugePrimaryColor

		const hex2rgb = (hex: string) => {
			const cleanHex = hex.replace('#', '')
			const r = parseInt(cleanHex.slice(0, 2), 16)
			const g = parseInt(cleanHex.slice(2, 4), 16)
			const b = parseInt(cleanHex.slice(4, 6), 16)
			return [r, g, b]
		}

		const startRGB = hex2rgb(gaugePrimaryColor)
		const endRGB = hex2rgb(gaugePrimaryEndColor)

		const progress = Math.min(Math.max(currentPercent / 100, 0), 1)

		const currentRGB = startRGB.map((start, i) => {
			const end = endRGB[i]
			const colorValue = Math.round(start + (end - start) * progress)
			return colorValue
		})

		return `rgb(${currentRGB.join(',')})`
	}

	const calculateArcPath = (percentage: number, arcSize: number = 360) => {
		const startAngleDegrees = -(arcSize / 2)
		const startAngle = (-startAngleDegrees + angleOffset) * (Math.PI / 180)
		const endAngle =
			(-startAngleDegrees + arcSize + angleOffset) * (Math.PI / 180)

		const start = {
			x: center.x + radius * Math.cos(startAngle),
			y: center.y + radius * Math.sin(startAngle),
		}
		const end = {
			x: center.x + radius * Math.cos(endAngle),
			y: center.y + radius * Math.sin(endAngle),
		}

		return `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${end.x} ${end.y}`
	}

	return (
		<div className={className}>
			<svg fill='none' className='size-full' viewBox='0 0 100 100'>
				<path
					d={calculateArcPath(100, arcSize)}
					stroke={gaugeSecondaryColor}
					strokeWidth='3'
					strokeLinecap='round'
					fill='none'
				/>

				<path
					d={calculateArcPath(100, arcSize)}
					stroke={getCurrentColor()}
					strokeWidth='2'
					strokeLinecap='round'
					fill='none'
					strokeDasharray={`${(currentPercent * circumference) / 100} ${circumference}`}
				/>
			</svg>
		</div>
	)
}
