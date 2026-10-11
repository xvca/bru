import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { DotsIcon } from './icons'

export interface RowMenuItem {
	label: string
	icon?: React.ReactNode
	onSelect: () => void
	danger?: boolean
	hidden?: boolean
}

interface RowMenuProps {
	label: string
	items: RowMenuItem[]
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
	width?: number
}

/** Vertical dots trigger plus a flat panel menu for list rows */
export function RowMenu({
	label,
	items,
	open,
	onOpenChange,
	className,
	width = 184,
}: RowMenuProps) {
	return (
		<DropdownMenuPrimitive.Root
			open={open}
			onOpenChange={onOpenChange}
			modal={false}
		>
			<DropdownMenuPrimitive.Trigger
				aria-label={label}
				className={cn(
					'-mr-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 outline-offset-[-2px] data-[state=open]:bg-well data-[state=open]:text-ink',
					className,
				)}
			>
				<DotsIcon />
			</DropdownMenuPrimitive.Trigger>
			<DropdownMenuPrimitive.Portal>
				<DropdownMenuPrimitive.Content
					align='end'
					sideOffset={4}
					collisionPadding={12}
					style={{ width }}
					className='z-40 rounded-2xl bg-panel p-1.5 text-ink shadow-[0_0_0_1px_var(--line),0_18px_30px_-10px_var(--sh)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
				>
					{items
						.filter((i) => !i.hidden)
						.map((item) => (
							<DropdownMenuPrimitive.Item
								key={item.label}
								onSelect={item.onSelect}
								className={cn(
									'flex h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium outline-none select-none data-highlighted:bg-well',
									item.danger && 'text-danger',
								)}
							>
								{item.icon}
								{item.label}
							</DropdownMenuPrimitive.Item>
						))}
				</DropdownMenuPrimitive.Content>
			</DropdownMenuPrimitive.Portal>
		</DropdownMenuPrimitive.Root>
	)
}
