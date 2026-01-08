import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import chroma from 'chroma-js'

interface GaugeProps {
	max: number
	value: number
	min: number
	arcSize: number
	gaugePrimaryColor: string
	gaugePrimaryEndColor?: string
	gaugeSecondaryColor: string
	className?: string
	isCompleted?: boolean
	completedColor?: string
}

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

const resolveColor = (color: string): string => {
	if (!color) return 'rgb(128, 128, 128)'

	if (color.startsWith('var(')) {
		const temp = document.createElement('div')
		temp.style.color = color
		document.body.appendChild(temp)
		const computed = getComputedStyle(temp).color
		document.body.removeChild(temp)
		return resolveColor(computed)
	}

	try {
		return chroma(color).css()
	} catch {
		return 'rgb(128, 128, 128)'
	}
}

const toRgba = (color: string, opacity: number): string => {
	try {
		return chroma(color).alpha(opacity).css()
	} catch {
		return `rgba(128, 128, 128, ${opacity})`
	}
}

const mixColors = (color1: string, color2: string, ratio: number): string => {
	try {
		return chroma.mix(color1, color2, ratio, 'oklch').css()
	} catch {
		return color1
	}
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
	isCompleted = false,
	completedColor = '#43694b',
}: GaugeProps) {
	const smoothValue = useProgressiveValue(value, 0.1)
	const [resolvedColors, setResolvedColors] = useState({
		primary: 'rgb(128, 128, 128)',
		end: 'rgb(128, 128, 128)',
		completed: 'rgb(67, 105, 75)',
	})

	useEffect(() => {
		setResolvedColors({
			primary: resolveColor(gaugePrimaryColor),
			end: resolveColor(gaugePrimaryEndColor || gaugePrimaryColor),
			completed: resolveColor(completedColor),
		})
	}, [gaugePrimaryColor, gaugePrimaryEndColor, completedColor])

	arcSize = Math.min(Math.max(arcSize, 180), 360)

	const currentPercent = ((smoothValue - min) / (max - min)) * 100

	const radius = 48
	const center = { x: 50, y: 55 }
	const angleOffset = 270 - arcSize
	const circumference = (arcSize / 360) * (2 * Math.PI * radius)

	const getBaseColor = () => {
		if (!gaugePrimaryEndColor) return resolvedColors.primary

		const progress = Math.min(Math.max(currentPercent / 100, 0), 1)
		return mixColors(resolvedColors.primary, resolvedColors.end, progress)
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

	const baseColor = getBaseColor()
	const glowColor = toRgba(resolvedColors.completed, 0.1)

	return (
		<motion.div
			className={className}
			animate={
				isCompleted
					? {
							scale: [1, 1.005, 1, 1.005, 1, 1.005, 1],
							filter: [
								'drop-shadow(0 0 0px transparent)',
								`drop-shadow(0 0 2px ${glowColor})`,
								'drop-shadow(0 0 0px transparent)',
								`drop-shadow(0 0 2px ${glowColor})`,
								'drop-shadow(0 0 0px transparent)',
								`drop-shadow(0 0 2px ${glowColor})`,
								'drop-shadow(0 0 0px transparent)',
							],
						}
					: { scale: 1 }
			}
			transition={{
				duration: 0.6,
				ease: 'easeInOut',
			}}
		>
			<svg fill='none' className='size-full' viewBox='0 0 100 100'>
				<path
					d={calculateArcPath(100, arcSize)}
					stroke={gaugeSecondaryColor}
					strokeWidth='3'
					strokeLinecap='round'
					fill='none'
				/>

				<motion.path
					d={calculateArcPath(100, arcSize)}
					strokeWidth='2'
					strokeLinecap='round'
					fill='none'
					strokeDasharray={`${(currentPercent * circumference) / 100} ${circumference}`}
					animate={{
						stroke: isCompleted ? resolvedColors.completed : baseColor,
					}}
					transition={{
						stroke: { duration: 0.25, ease: 'easeOut' },
					}}
				/>
			</svg>
		</motion.div>
	)
}
