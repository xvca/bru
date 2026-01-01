import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DataPoint {
	time: number
	weight: number
	flowRate: number
}

interface BrewGraphProps {
	currentWeight: number
	currentFlowRate: number
	currentTime: number
	isBrewing: boolean
	className?: string | undefined
}

const MAX_POINTS = 1000
const LERP_SPEED = 0.12

const getColor = (varName: string, fallback: string): string => {
	if (typeof window === 'undefined') return fallback
	const temp = document.createElement('div')
	temp.style.color = `var(${varName})`
	document.body.appendChild(temp)
	const color = getComputedStyle(temp).color
	document.body.removeChild(temp)
	return color || fallback
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const drawCurve = (
	ctx: CanvasRenderingContext2D,
	points: { x: number; y: number }[],
	color: string,
	width: number,
) => {
	if (points.length < 2) return

	ctx.beginPath()
	ctx.strokeStyle = color
	ctx.lineWidth = width
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	ctx.moveTo(points[0].x, points[0].y)

	if (points.length === 2) {
		ctx.lineTo(points[1].x, points[1].y)
		ctx.stroke()
		return
	}

	// catmull-rom spline through points
	const pts = [points[0], ...points, points[points.length - 1]]

	for (let i = 1; i < pts.length - 2; i++) {
		const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]]

		for (let t = 0.02; t <= 1; t += 0.02) {
			const t2 = t * t,
				t3 = t2 * t
			ctx.lineTo(
				0.5 *
					(2 * p1.x +
						(-p0.x + p2.x) * t +
						(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
						(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				0.5 *
					(2 * p1.y +
						(-p0.y + p2.y) * t +
						(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
						(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
			)
		}
	}
	ctx.stroke()
}

const drawDot = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	label: string,
	color: string,
	bgColor: string,
) => {
	ctx.beginPath()
	ctx.arc(x, y, 5, 0, Math.PI * 2)
	ctx.fillStyle = bgColor
	ctx.fill()
	ctx.strokeStyle = color
	ctx.lineWidth = 3
	ctx.stroke()

	ctx.fillStyle = color
	ctx.font = 'bold 13px ui-monospace, monospace'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'bottom'
	ctx.fillText(label, x, y - 10)
}

export function BrewGraph({
	currentWeight,
	currentFlowRate,
	currentTime,
	isBrewing,
	className,
}: BrewGraphProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const stateRef = useRef({
		data: [] as DataPoint[],
		animated: null as DataPoint | null,
		target: null as DataPoint | null,
		scale: { maxWeight: 1, maxFlowRate: 1 },
		colors: { primary: '#3b82f6', flow: '#94a3b8', bg: '#ffffff' },
	})
	const [isEmpty, setIsEmpty] = useState(true)
	const lastBrewStateRef = useRef(isBrewing)

	useEffect(() => {
		stateRef.current.colors = {
			primary: getColor('--primary', '#3b82f6'),
			flow: getColor('--frozen-foreground', '#94a3b8'),
			bg: getColor('--background', '#ffffff'),
		}
	}, [])

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let width = 0,
			height = 0
		const padding = { top: 20, right: 50, bottom: 30, left: 50 }

		const resize = () => {
			const rect = container.getBoundingClientRect()
			const dpr = window.devicePixelRatio || 1
			width = rect.width
			height = rect.height
			canvas.width = width * dpr
			canvas.height = height * dpr
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		const resizeObserver = new ResizeObserver(resize)
		resizeObserver.observe(container)
		resize()

		const draw = () => {
			const { data, animated, scale, colors } = stateRef.current
			const points = animated ? [...data, animated] : data
			if (points.length < 2) return

			ctx.clearRect(0, 0, width, height)

			const chartW = width - padding.left - padding.right
			const chartH = height - padding.top - padding.bottom
			const times = points.map((p) => p.time)
			const minT = Math.min(...times),
				maxT = Math.max(...times)

			const scaleX = (t: number) =>
				padding.left + ((t - minT) / (maxT - minT || 1)) * chartW
			const scaleYW = (w: number) =>
				padding.top + chartH - (w / scale.maxWeight) * chartH
			const scaleYF = (f: number) =>
				padding.top + chartH - (f / scale.maxFlowRate) * chartH

			const weightPts = points.map((p) => ({
				x: scaleX(p.time),
				y: scaleYW(p.weight),
			}))
			const flowPts = points.map((p) => ({
				x: scaleX(p.time),
				y: scaleYF(p.flowRate),
			}))

			drawCurve(ctx, weightPts, colors.primary, 3)
			drawCurve(ctx, flowPts, colors.flow, 3)

			const last = points[points.length - 1]
			const lastW = weightPts[weightPts.length - 1]
			const lastF = flowPts[flowPts.length - 1]

			drawDot(
				ctx,
				lastW.x,
				lastW.y,
				`${last.weight.toFixed(1)}g`,
				colors.primary,
				colors.bg,
			)
			drawDot(
				ctx,
				lastF.x,
				lastF.y,
				`${last.flowRate.toFixed(1)}g/s`,
				colors.flow,
				colors.bg,
			)
		}

		let animationId: number
		const animate = () => {
			const state = stateRef.current

			if (state.animated && state.target) {
				state.animated.time = lerp(
					state.animated.time,
					state.target.time,
					LERP_SPEED,
				)
				state.animated.weight = lerp(
					state.animated.weight,
					state.target.weight,
					LERP_SPEED,
				)
				state.animated.flowRate = lerp(
					state.animated.flowRate,
					state.target.flowRate,
					LERP_SPEED,
				)
			}

			const allPoints = state.target
				? [...state.data, state.target]
				: state.data
			if (allPoints.length > 0) {
				const targetMaxW = Math.max(...allPoints.map((p) => p.weight), 1) * 1.1
				const targetMaxF =
					Math.max(...allPoints.map((p) => p.flowRate), 1) * 1.2
				state.scale.maxWeight = Math.max(
					lerp(state.scale.maxWeight, targetMaxW, 0.05),
					state.scale.maxWeight,
				)
				state.scale.maxFlowRate = Math.max(
					lerp(state.scale.maxFlowRate, targetMaxF, 0.05),
					state.scale.maxFlowRate,
				)
			}

			draw()
			animationId = requestAnimationFrame(animate)
		}

		animationId = requestAnimationFrame(animate)

		return () => {
			resizeObserver.disconnect()
			cancelAnimationFrame(animationId)
		}
	}, [])

	useEffect(() => {
		if (!isBrewing) return

		const state = stateRef.current
		const newPoint = {
			time: currentTime / 1000,
			weight: currentWeight,
			flowRate: currentFlowRate,
		}

		if (state.animated) {
			state.data = [...state.data.slice(-MAX_POINTS + 1), { ...state.animated }]
		}

		state.target = newPoint
		state.animated = state.animated ?? { ...newPoint }
		setIsEmpty(false)
	}, [currentWeight, currentFlowRate, currentTime, isBrewing])

	useEffect(() => {
		if (isBrewing && !lastBrewStateRef.current) {
			stateRef.current = {
				...stateRef.current,
				data: [],
				animated: null,
				target: null,
				scale: { maxWeight: 1, maxFlowRate: 1 },
			}
			setIsEmpty(true)
		}

		lastBrewStateRef.current = isBrewing
	}, [isBrewing])

	if (isEmpty && !isBrewing) return null

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.3 }}
			className={cn('relative', className)}
		>
			<Card className='border-none bg-background/50 shadow-none'>
				<CardContent className='p-0'>
					<div ref={containerRef} className='h-64 w-full'>
						<canvas ref={canvasRef} className='w-full h-full' />
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}
