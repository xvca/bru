import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Snowflake } from 'lucide-react'
import { format } from 'date-fns'
import type { Bean } from 'generated/prisma/client'

interface BeanSelectProps {
	beans: Bean[]
	value: string
	onChange: (value: string) => void
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function BeanSelect({
	beans,
	value,
	onChange,
	open,
	onOpenChange,
}: BeanSelectProps) {
	const availableBeans = beans.filter(
		(b) =>
			b.remainingWeight === null ||
			b.remainingWeight > 0 ||
			b.id.toString() === value,
	)

	const activeBeans = availableBeans.filter(
		(b) => !b.freezeDate || !!b.thawDate,
	)

	const frozenBeans = availableBeans.filter(
		(b) => !!b.freezeDate && !b.thawDate,
	)

	const selectedBean = beans.find((b) => b.id.toString() === value)
	const isSelectedFrozen = selectedBean?.freezeDate && !selectedBean?.thawDate

	return (
		<Select
			value={value}
			onValueChange={onChange}
			open={open}
			onOpenChange={onOpenChange}
		>
			<SelectTrigger className='h-auto py-2'>
				{selectedBean ? (
					<div className='flex flex-col items-start text-left w-full overflow-hidden'>
						<span className='font-medium flex items-center gap-2 truncate w-full'>
							{selectedBean.name}
							{isSelectedFrozen && (
								<Snowflake className='h-3 w-3 text-frozen-foreground shrink-0' />
							)}
						</span>
						<span className='text-xs text-muted-foreground truncate w-full'>
							{selectedBean.roaster} •{' '}
							{format(new Date(selectedBean.roastDate), 'MMM d')}
						</span>
					</div>
				) : (
					<span className='text-muted-foreground'>Select a bean</span>
				)}
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Active Stash</SelectLabel>
					{activeBeans.map((bean) => (
						<SelectItem key={bean.id} value={bean.id.toString()}>
							<div className='flex flex-col gap-0.5'>
								<span className='font-medium'>{bean.name}</span>
								<div className='flex items-center gap-2 text-xs text-muted-foreground'>
									<span>{bean.roaster}</span>
									<span>•</span>
									<span>{format(new Date(bean.roastDate), 'MMM d')}</span>
									<span>•</span>
									<span className='font-medium text-foreground'>
										{bean.remainingWeight}g left
									</span>
								</div>
							</div>
						</SelectItem>
					))}
				</SelectGroup>

				{frozenBeans.length > 0 && (
					<SelectGroup>
						<SelectLabel className='flex items-center gap-2 text-frozen-foreground mt-2 border-t pt-2'>
							<Snowflake className='h-3 w-3' /> Frozen Stash
						</SelectLabel>
						{frozenBeans.map((bean) => (
							<SelectItem
								key={bean.id}
								value={bean.id.toString()}
								className='opacity-70'
							>
								<div className='flex flex-col gap-0.5'>
									<span className='font-medium flex items-center gap-2'>
										{bean.name}
									</span>
									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<span>
											Frozen: {format(new Date(bean.freezeDate!), 'MMM d')}
										</span>
										<span>•</span>
										<span>{bean.remainingWeight}g</span>
									</div>
								</div>
							</SelectItem>
						))}
					</SelectGroup>
				)}
			</SelectContent>
		</Select>
	)
}
