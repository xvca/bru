import { motion, type HTMLMotionProps } from 'framer-motion'

/** Rows fade up as they scroll into view, and back out as they leave */
export function FadeIn({
	y = 16,
	duration = 0.4,
	...props
}: HTMLMotionProps<'div'> & { y?: number; duration?: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration, ease: [0.2, 0.7, 0.2, 1] }}
			{...props}
		/>
	)
}

/** Height + fade expand/collapse for sections that toggle open */
export const collapse = {
	initial: { height: 0, opacity: 0 },
	animate: { height: 'auto', opacity: 1 },
	exit: { height: 0, opacity: 0 },
	transition: { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] },
} as const
