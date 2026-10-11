import { useId, type ReactNode } from 'react'
import NumberFlow, { continuous } from '@number-flow/react'
import { cn } from '@/lib/utils'

const SIZE = 336
const C = SIZE / 2
// 300 degree sweep with 101 ticks, a long tick every 10
const A0 = 118.5
const A1 = 421.5

const arcPath = (r: number) => {
	const a0 = (A0 * Math.PI) / 180
	const a1 = (A1 * Math.PI) / 180
	const f = (n: number) => n.toFixed(2)
	return `M ${f(C + r * Math.cos(a0))} ${f(C + r * Math.sin(a0))} A ${r} ${r} 0 1 1 ${f(C + r * Math.cos(a1))} ${f(C + r * Math.sin(a1))}`
}

const ROLL = { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }

const SHORT = arcPath(146)
const LONG = arcPath(143)

/** Pie wedge from the centre that reveals ticks up to progress p (0..1) */
const wedge = (p: number) => {
	const R = 220
	const n = p > 0 ? Math.floor(Math.min(p, 1) * 100 + 1e-6) : -1
	if (n < 0) return `${C},${C}`
	const end = 120 + 3 * n + 1.5
	const pt = (a: number) => {
		const r = (a * Math.PI) / 180
		return `${(C + R * Math.cos(r)).toFixed(1)},${(C + R * Math.sin(r)).toFixed(1)}`
	}
	const pts = [`${C},${C}`]
	for (let a = 117; a < end; a += 3) pts.push(pt(a))
	pts.push(pt(end))
	return pts.join(' ')
}

interface DialProps {
	weight: number
	target: number
	time: number
	/** null shows a dash (idle) */
	flow: number | null
	/** Target appears on the dial only while a shot runs */
	showTarget: boolean
	done: boolean
	scale: number
}

export function Dial({
	weight,
	target,
	time,
	flow,
	showTarget,
	done,
	scale,
}: DialProps) {
	const clipId = useId().replace(/:/g, '')
	const w = Math.max(0, weight)
	const p = target > 0 ? Math.max(0, Math.min(1, w / target)) : 0
	const lit = done ? 'var(--dial-done)' : 'var(--dial-lit)'
	const weightText = w.toFixed(1)
	// Sized so the digits' corners keep clear of the long ticks (inner edge
	// at r=135): 84px for 0.0–99.9, 64px for soup shots of 100.0 g and up
	const weightSize = weightText.length > 4 ? 64 : 84
	// Whole seconds, so each digit rolls once a second; tenths would keep the
	// readout spinning at the scale's update rate
	const seconds = Math.max(0, Math.floor(time))
	const timeText = String(seconds)
	const flowText = flow === null ? '–' : Math.max(0, flow).toFixed(1)
	// Shrink the readouts only when both get unusually long; soup shots
	// (105 s at 12.4 g/s) still fit at full size
	const compact = timeText.length + flowText.length > 7

	const tick = (
		d: string,
		width: number,
		dash: string,
		stroke: string,
		clip?: boolean,
	) => (
		<path
			d={d}
			pathLength={101}
			clipPath={clip ? `url(#${clipId})` : undefined}
			style={{
				fill: 'none',
				stroke,
				strokeWidth: width,
				strokeDasharray: dash,
				strokeDashoffset: -0.36,
				transition: 'stroke .4s ease',
			}}
		/>
	)

	return (
		<div
			className='well relative shrink-0 rounded-full'
			style={{
				width: SIZE,
				height: SIZE,
				transform: `scale(${scale})`,
				transition: 'transform .35s ease',
			}}
		>
			<svg
				width={SIZE}
				height={SIZE}
				viewBox={`0 0 ${SIZE} ${SIZE}`}
				className='absolute inset-0'
				role='img'
				aria-label={`Weight ${weightText} grams of ${target.toFixed(1)} gram target`}
			>
				<defs>
					<clipPath id={clipId}>
						<polygon points={wedge(p)} />
					</clipPath>
				</defs>
				{tick(SHORT, 10, '0.28 0.72', 'var(--tick)')}
				{tick(LONG, 16, '0.28 9.72', 'var(--tick-long)')}
				{tick(SHORT, 10, '0.28 0.72', lit, true)}
				{tick(LONG, 16, '0.28 9.72', lit, true)}
			</svg>

			<div className='absolute inset-x-0 top-[92px] flex flex-col items-center'>
				<div className='flex h-[84px] items-end gap-1.5'>
					<span
						className='font-mono leading-[84px] font-medium tracking-[-0.04em]'
						style={{ fontSize: weightSize }}
					>
						{weightText}
					</span>
					<span className='pb-1.5 font-mono text-[18px] font-medium text-ink-2'>
						g
					</span>
				</div>
				<div className={cn('mt-[14px] flex', compact ? 'gap-5' : 'gap-7')}>
					<Readout
						label='Time'
						value={
							<NumberFlow
								value={seconds}
								plugins={[continuous]}
								trend={1}
								spinTiming={ROLL}
								transformTiming={ROLL}
								willChange
							/>
						}
						unit='s'
						compact={compact}
					/>
					<Readout label='Flow' value={flowText} unit='g/s' compact={compact} />
				</div>
			</div>

			{showTarget && (
				<div className='lbl absolute inset-x-0 bottom-3 text-center'>
					Target {target.toFixed(1)} g
				</div>
			)}
		</div>
	)
}

function Readout({
	label,
	value,
	unit,
	compact,
}: {
	label: string
	value: ReactNode
	unit: string
	compact?: boolean
}) {
	return (
		<div className='flex flex-col items-center'>
			<div className='lbl text-[10px]'>{label}</div>
			<div
				className={cn(
					'mt-0.5 font-mono font-medium whitespace-nowrap',
					compact ? 'text-[24px]' : 'text-[30px]',
				)}
			>
				{value}
				<span
					className={cn('text-ink-2', compact ? 'text-[12px]' : 'text-[14px]')}
				>
					{' '}
					{unit}
				</span>
			</div>
		</div>
	)
}
