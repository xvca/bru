import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import { Brew } from '@/generated/prisma/client'
import { useSuggestions } from '@/hooks/useSuggestions'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export interface SmartSuggestion {
	id: number
	name: string
	roaster: string | null
	roastLevel: string | null
	lastBrew: Brew
}

interface SmartCarouselProps {
	selectedBeanId: number | null
	onBeanToggle: (bean: SmartSuggestion, nextSelected: boolean) => void
	onTargetRequest: (weight: number) => void
	className?: string | undefined
}

export function SmartCarousel({
	selectedBeanId,
	onBeanToggle,
	onTargetRequest,
	className,
}: SmartCarouselProps) {
	const {
		suggestions: rawSuggestions,
		decafStartHour,
		isLoading,
	} = useSuggestions()

	const suggestions = useMemo(() => {
		const hour = new Date().getHours()
		let isEvening = hour >= decafStartHour
		if (decafStartHour === -1) isEvening = false

		return [...rawSuggestions].sort((a, b) => {
			const isADecaf =
				a.name.toLowerCase().includes('decaf') ||
				(a.roaster && a.roaster.toLowerCase().includes('decaf'))
			const isBDecaf =
				b.name.toLowerCase().includes('decaf') ||
				(b.roaster && b.roaster.toLowerCase().includes('decaf'))

			if (isEvening) {
				if (isADecaf && !isBDecaf) return -1
				if (!isADecaf && isBDecaf) return 1
			} else {
				if (isADecaf && !isBDecaf) return 1
				if (!isADecaf && isBDecaf) return -1
			}
			return 0
		})
	}, [rawSuggestions, decafStartHour])

	const handleCardClick = (bean: SmartSuggestion) => {
		const isAlreadySelected = bean.id === selectedBeanId
		const nextSelected = !isAlreadySelected
		onBeanToggle(bean, nextSelected)

		if (nextSelected && bean.lastBrew?.yieldWeight) {
			onTargetRequest(Number(bean.lastBrew.yieldWeight.toFixed(1)))
		}
	}

	if (isLoading) {
		return (
			<div className={cn('relative', className)}>
				<div className='flex h-48 items-center justify-center'>
					<Skeleton className='h-40 w-full rounded-2xl' />
				</div>
			</div>
		)
	}

	if (suggestions.length === 0) return null

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-50px' }}
			transition={{ duration: 0.5, ease: 'easeOut' }}
			className={cn('relative', className)}
		>
			<Carousel
				opts={{
					align: 'center',
					containScroll: 'trimSnaps',
					loop: true,
				}}
				className={cn('relative', className)}
			>
				<div className='pointer-events-none absolute inset-y-0 -left-1 w-4 bg-linear-to-r from-background via-background/90 to-transparent z-10' />
				<div className='pointer-events-none absolute inset-y-0 -right-1 w-4 bg-linear-to-l from-background via-background/90 to-transparent z-10' />
				<CarouselContent
					className='p-3 sm:p-4'
					onTransitionEndCapture={undefined}
				>
					{suggestions.map((bean, index) => {
						const isSelected = bean.id === selectedBeanId
						const currentBrew = bean.lastBrew

						if (!currentBrew) {
							return null
						}

						return (
							<CarouselItem key={bean.id}>
								<Card
									onClick={() => handleCardClick(bean)}
									className={cn(
										'cursor-pointer rounded-2xl border border-border/40 bg-card/80 shadow-sm transition-all sm:rounded-3xl',
										'max-h-80 sm:max-h-none',
										isSelected && 'border-primary ring-2 ring-primary/40',
									)}
								>
									<CardContent className='space-y-3 p-6 sm:space-y-4'>
										<div className='space-y-0.5 sm:space-y-1 flex justify-between items-center'>
											<div className='flex flex-col'>
												<div>{bean.name}</div>
												<div className='text-xs uppercase'>
													{bean.roaster || 'Unknown roaster'}
												</div>
											</div>
											<div className='text-xs'>
												{currentBrew.grindSize !== null
													? `Grind: ${currentBrew.grindSize}`
													: '—'}
											</div>
										</div>

										<div className='space-y-3 sm:space-y-4'>
											<div className='grid grid-cols-4 gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground'>
												<div className='text-center'>
													<div className='font-mono text-sm text-foreground'>
														{currentBrew.doseWeight ?? '–'}g
													</div>
													Dose
												</div>
												<div className='text-center'>
													<div className='font-mono text-sm text-foreground'>
														{currentBrew.yieldWeight ?? '–'}g
													</div>
													Yield
												</div>
												<div className='text-center'>
													<div className='font-mono text-sm text-foreground'>
														{currentBrew.waterTemperature ?? '–'}
														&deg;C
													</div>
													Temp
												</div>
												<div className='text-center'>
													<div className='font-mono text-sm text-foreground'>
														{currentBrew.brewTime ?? '–'}s
													</div>
													Time
												</div>
											</div>

											<div className='flex items-center gap-4'>
												<div className='flex items-center gap-1.5'>
													<Star className='h-3.5 w-3.5 text-amber-400' />
													{currentBrew.rating !== null
														? `${currentBrew.rating}/5`
														: 'Not rated'}
												</div>
												<div className='grow rounded-lg border border-muted/40 bg-muted/20 p-3 text-xs text-muted-foreground line-clamp-2 sm:text-sm'>
													{currentBrew.tastingNotes
														? `“${currentBrew.tastingNotes}”`
														: 'No tasting notes yet. Add one after your next shot.'}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</CarouselItem>
						)
					})}
				</CarouselContent>
			</Carousel>
		</motion.div>
	)
}
