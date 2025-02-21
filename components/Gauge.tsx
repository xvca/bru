import type React from 'react'

interface Gauge {
	max: number
	value: number
	min: number
	arcSize: number
	gaugePrimaryColor: string
	gaugePrimaryEndColor: string
	gaugeSecondaryColor: string
	className?: string
}

export function Gauge({
	max = 100,
	min = 0,
	value = 0,
	arcSize = 250,
	gaugePrimaryColor,
	gaugePrimaryEndColor,
	gaugeSecondaryColor,
	className,
}: Gauge) {
	arcSize = Math.min(Math.max(arcSize, 180), 360)
	const currentPercent = Math.round(((value - min) / (max - min)) * 100)

	// Arc calculation helpers
	const radius = 48
	const center = { x: 50, y: 55 }

	const angleOffset = 270 - arcSize

	const circumference = (arcSize / 360) * (2 * Math.PI * radius)

	const getCurrentColor = () => {
		if (!gaugePrimaryEndColor) return gaugePrimaryColor

		// Convert hex to RGB for interpolation
		const hex2rgb = (hex: string) => {
			const r = parseInt(hex.slice(1, 3), 16)
			const g = parseInt(hex.slice(3, 5), 16)
			const b = parseInt(hex.slice(5, 7), 16)
			return [r, g, b]
		}

		const startRGB = hex2rgb(gaugePrimaryColor)
		const endRGB = hex2rgb(gaugePrimaryEndColor)

		// Interpolate between colors based on progress
		const progress = currentPercent / 100
		const currentRGB = startRGB.map((start, i) => {
			const end = endRGB[i]
			const value = Math.round(start + (end - start) * progress)
			return value
		})

		return `rgb(${currentRGB.join(',')})`
	}

	const calculateArcPath = (percentage: number, arcSize: number = 360) => {
		// Calculate full arc path
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
				{/* Background arc */}
				<path
					d={calculateArcPath(100, arcSize)}
					stroke={gaugeSecondaryColor}
					strokeWidth='3'
					strokeLinecap='round'
					fill='none'
				/>

				{/* Progress arc */}
				<path
					d={calculateArcPath(100, arcSize)} // Full arc path
					stroke={getCurrentColor()}
					strokeWidth='2'
					strokeLinecap='round'
					fill='none'
					strokeDasharray={`${(currentPercent * circumference) / 100} ${circumference}`}
					className='transition-[stroke-dasharray] duration-500 ease-in-out'
				/>
			</svg>
		</div>
	)
}
