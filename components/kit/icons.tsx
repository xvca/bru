// Custom glyphs drawn for Bru. Everything else uses lucide.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size: number, strokeWidth = 1.75) => ({
	width: size,
	height: size,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
	'aria-hidden': true,
})

export const DialIcon = ({ size = 22, ...p }: IconProps) => (
	<svg {...base(size)} {...p}>
		<circle cx='12' cy='12' r='8.5' />
		<path d='M12 12l4-3.5' />
		<path d='M12 3.5v1.5M20.5 12H19M3.5 12H5' />
	</svg>
)

export const ListIcon = ({ size = 22, ...p }: IconProps) => (
	<svg {...base(size)} {...p}>
		<path d='M8 6h12M8 12h12M8 18h12' />
		<path d='M4 6h.01M4 12h.01M4 18h.01' />
	</svg>
)

export const BeanIcon = ({ size = 22, ...p }: IconProps) => (
	<svg {...base(size)} {...p}>
		<ellipse cx='12' cy='12' rx='5.5' ry='8.5' transform='rotate(35 12 12)' />
		<path d='M8.5 8.2c2.2 1.2 2.6 2.8 1.6 4.2s-.4 3.2 2 4.4' />
	</svg>
)

export const SlidersIcon = ({ size = 22, ...p }: IconProps) => (
	<svg {...base(size)} {...p}>
		<path d='M4 7h9M17 7h3M4 17h3M11 17h9' />
		<circle cx='15' cy='7' r='2' />
		<circle cx='9' cy='17' r='2' />
	</svg>
)

export const MachineIcon = ({ size = 22, ...p }: IconProps) => (
	<svg {...base(size)} {...p}>
		<path d='M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 5v15.5' />
		<path d='M3.5 20.5h17M5 9h14M10 9v2h4V9' />
		<path d='M9.5 15h5v1.5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z' />
	</svg>
)

export const PlusIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...base(size, 2.5)} {...p}>
		<path d='M12 5v14M5 12h14' />
	</svg>
)

export const MinusIcon = ({ size = 18, ...p }: IconProps) => (
	<svg {...base(size, 2)} {...p}>
		<path d='M5 12h14' />
	</svg>
)

export const DotsIcon = ({ size = 18, ...p }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='currentColor'
		aria-hidden
		{...p}
	>
		<circle cx='12' cy='5' r='1.6' />
		<circle cx='12' cy='12' r='1.6' />
		<circle cx='12' cy='19' r='1.6' />
	</svg>
)

export const PlayIcon = ({ size = 22, ...p }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='currentColor'
		aria-hidden
		{...p}
	>
		<path d='M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z' />
	</svg>
)

export const StopIcon = ({ size = 20, ...p }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='currentColor'
		aria-hidden
		{...p}
	>
		<rect x='5' y='5' width='14' height='14' rx='2' />
	</svg>
)

export const CheckIcon = ({ size = 14, ...p }: IconProps) => (
	<svg {...base(size, 3)} {...p}>
		<path d='M5 12.5l4.5 4.5L19 7.5' />
	</svg>
)

export const StarIcon = ({
	size = 26,
	filled,
	...p
}: IconProps & { filled?: boolean }) => (
	<svg
		{...base(size)}
		fill={filled ? 'currentColor' : 'none'}
		strokeLinejoin='round'
		{...p}
	>
		<path d='M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.6l6.1-.8z' />
	</svg>
)

export const BoltIcon = ({ size = 9, ...p }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='currentColor'
		aria-hidden
		{...p}
	>
		<path d='M13 2L4 14h6l-1 8 9-12h-6z' />
	</svg>
)

export const ChevronIcon = ({
	size = 18,
	dir = 'down',
	...p
}: IconProps & { dir?: 'down' | 'right' | 'left' }) => (
	<svg {...base(size, 2)} {...p}>
		{dir === 'down' && <path d='M7 10l5 5 5-5' />}
		{dir === 'right' && <path d='M9 6l6 6-6 6' />}
		{dir === 'left' && <path d='M15 6l-6 6 6 6' />}
	</svg>
)

export const SnowIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...base(size, 1.9)} {...p}>
		<path d='M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9' />
	</svg>
)

export const SparkIcon = ({ size = 16, ...p }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='currentColor'
		aria-hidden
		{...p}
	>
		<path d='M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z' />
	</svg>
)

// Menu glyphs (16px, stroke 1.9)
const menu = (size: number) => base(size, 1.9)

export const EditIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...menu(size)} {...p}>
		<path d='M4 20h4L19 9l-4-4L4 16z' />
	</svg>
)

export const CloneIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...menu(size)} {...p}>
		<rect x='8' y='8' width='12' height='12' rx='2' />
		<path d='M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' />
	</svg>
)

export const TrashIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...menu(size)} {...p}>
		<path d='M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' />
	</svg>
)

export const CupIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...menu(size)} {...p}>
		<path d='M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z' />
		<path d='M16 10h1.5a2.5 2.5 0 0 1 0 5H16' />
	</svg>
)

export const DoneIcon = ({ size = 16, ...p }: IconProps) => (
	<svg {...menu(size)} {...p}>
		<path d='M5 12.5l4.5 4.5L19 7.5' />
	</svg>
)
