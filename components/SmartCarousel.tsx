import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { useBrewBar } from '@/lib/brewBarContext'
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
	const { activeBarId } = useBrewBar()
	const { user } = useAuth()

	const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
	const [loading, setLoading] = useState(true)
	const [decafStartHour, setDecafStartHour] = useState(14)
	const [activeIndex, setActiveIndex] = useState(0)

	useEffect(() => {
		if (!user?.token) {
			setSuggestions([])
			setLoading(false)
			return
		}

		if (activeBarId == null) {
			setSuggestions([])
			setLoading(false)
			return
		}

		let isMounted = true
		setLoading(true)

		const fetchData = async () => {
			try {
				const { data } = await axios.get(
					`/api/dashboard/suggestions?barId=${activeBarId}`,
					{
						headers: { Authorization: `Bearer ${user.token}` },
					},
				)

				if (!isMounted) return

				setDecafStartHour(data.decafStartHour)

				const hour = new Date().getHours()
				let isEvening = hour >= data.decafStartHour

				if (decafStartHour === -1) {
					isEvening = false
				}

				const sorted: SmartSuggestion[] = [...data.suggestions].sort((a, b) => {
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

				setSuggestions(sorted)
				setActiveIndex(0)
			} catch (error) {
				console.error('Failed to load suggestions', error)
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		fetchData()

		return () => {
			isMounted = false
		}
	}, [activeBarId, user?.token])

	const isEvening = useMemo(
		() => new Date().getHours() >= decafStartHour,
		[decafStartHour],
	)

	const handleSelect = (index: number) => setActiveIndex(index)

	const handleCardClick = (bean: SmartSuggestion) => {
		const isAlreadySelected = bean.id === selectedBeanId
		const nextSelected = !isAlreadySelected
		onBeanToggle(bean, nextSelected)

		if (nextSelected && bean.lastBrew?.yieldWeight) {
			onTargetRequest(Number(bean.lastBrew.yieldWeight.toFixed(1)))
		}
	}

	if (loading) {
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
						return
					}

					return (
						<CarouselItem
							key={bean.id}
							onPointerUpCapture={() => handleSelect(index)}
							onTouchEndCapture={() => handleSelect(index)}
						>
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
													{currentBrew.waterTemperature ?? '–'}s
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
	)
}
