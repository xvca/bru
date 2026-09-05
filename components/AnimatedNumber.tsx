'use client'

import NumberFlow, {
	NumberFlowGroup,
	continuous as continuousPlugin,
} from '@number-flow/react'
import type { ComponentProps } from 'react'

export interface AnimatedNumberProps {
	value: number
	decimals?: number
	suffix?: string
	prefix?: string
	className?: string
	continuous?: boolean
	trend?: ComponentProps<typeof NumberFlow>['trend']
	spinTiming?: { duration: number; easing: string }
	transformTiming?: { duration: number; easing: string }
}

export function AnimatedNumber({
	value,
	decimals = 1,
	suffix = '',
	prefix = '',
	className = '',
	continuous = true,
	trend = 1,
	spinTiming = { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
	transformTiming = { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
}: AnimatedNumberProps) {
	return (
		<NumberFlow
			value={value}
			format={{
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			}}
			suffix={suffix ? suffix : undefined}
			prefix={prefix ? prefix : undefined}
			plugins={continuous ? [continuousPlugin] : undefined}
			trend={trend}
			spinTiming={spinTiming}
			transformTiming={transformTiming}
			willChange
			className={className}
		/>
	)
}

export interface StaticNumberProps {
	value: number
	decimals?: number
	suffix?: string
	prefix?: string
	className?: string
}

export function StaticNumber({
	value,
	decimals = 1,
	suffix = '',
	prefix = '',
	className = '',
}: StaticNumberProps) {
	return (
		<span className={className}>
			{prefix}
			{value.toFixed(decimals)}
			{suffix}
		</span>
	)
}

export interface AnimatedNumberGroupProps {
	children: React.ReactNode
}

export function AnimatedNumberGroup({ children }: AnimatedNumberGroupProps) {
	return <NumberFlowGroup>{children}</NumberFlowGroup>
}

export default AnimatedNumber
