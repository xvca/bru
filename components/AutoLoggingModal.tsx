import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import type { Bean } from '@/generated/prisma/client'
import { beanColor } from '@/lib/beanColor'
import { Sheet } from '@/components/kit/Sheet'
import { Key, NeutralKey } from '@/components/kit/buttons'
import { Swatch, ValueRow } from '@/components/kit/rows'
import { RowSkeleton } from '@/components/kit/states'
import { BeanPicker } from '@/components/BeanPicker'

interface AutoLoggingModalProps {
	isOpen: boolean
	onClose: () => void
	onSaved?: () => void
}

export default function AutoLoggingModal({
	isOpen,
	onClose,
	onSaved,
}: AutoLoggingModalProps) {
	const [beans, setBeans] = useState<Bean[]>([])
	const [defaultRegularBeanId, setDefaultRegularBeanId] = useState<
		number | null
	>(null)
	const [defaultDecafBeanId, setDefaultDecafBeanId] = useState<number | null>(
		null,
	)
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [picking, setPicking] = useState<'regular' | 'decaf' | null>(null)

	useEffect(() => {
		if (!isOpen) return

		const load = async () => {
			setIsLoading(true)
			try {
				const [beansResponse, settingsResponse] = await Promise.all([
					axios.get('/api/beans'),
					axios.get('/api/auto-logging'),
				])
				setBeans(beansResponse.data)
				setDefaultRegularBeanId(
					settingsResponse.data.defaultRegularBeanId ?? null,
				)
				setDefaultDecafBeanId(settingsResponse.data.defaultDecafBeanId ?? null)
			} catch (error) {
				console.error('Error loading auto-logging settings:', error)
				toast.error('Failed to load auto-logging settings')
			} finally {
				setIsLoading(false)
			}
		}
		void load()
	}, [isOpen])

	const save = async () => {
		setIsSaving(true)
		try {
			await axios.put('/api/auto-logging', {
				defaultRegularBeanId,
				defaultDecafBeanId,
			})
			toast.success('Auto-logging beans updated')
			onSaved?.()
			onClose()
		} catch (error) {
			console.error('Error saving auto-logging settings:', error)
			toast.error('Failed to save auto-logging settings')
		} finally {
			setIsSaving(false)
		}
	}

	const beanTitle = (id: number | null) => {
		const bean = beans.find((b) => b.id === id)
		if (!bean) return <span className='text-ink-2'>Not set</span>
		return (
			<span className='flex items-center gap-[9px]'>
				<Swatch color={beanColor(bean)} />
				<span className='truncate'>{bean.name}</span>
			</span>
		)
	}

	return (
		<>
			<Sheet
				open={isOpen}
				onClose={onClose}
				title='Beans for auto-logs'
				description='Which beans Autobru uses for automatic brew logs.'
				footer={
					<div className='flex items-center gap-3 pb-1.5'>
						<NeutralKey
							onClick={onClose}
							className='text-[16px] tracking-normal normal-case'
						>
							Cancel
						</NeutralKey>
						<Key
							onClick={save}
							disabled={isSaving || isLoading || beans.length === 0}
							className='flex-1'
						>
							{isSaving ? 'Saving…' : 'Save'}
						</Key>
					</div>
				}
			>
				{isLoading ? (
					<RowSkeleton rows={2} variant='simple' />
				) : beans.length === 0 ? (
					<p className='py-3 text-[14px] text-ink-2'>
						No beans yet. Add a bag on the Beans tab first.
					</p>
				) : (
					<>
						<ValueRow
							first
							chevron='down'
							title={
								<span className='flex flex-col gap-0.5'>
									<span className='text-[13px] font-normal text-ink-2'>
										Regular bean
									</span>
									{beanTitle(defaultRegularBeanId)}
								</span>
							}
							onClick={() => setPicking('regular')}
						/>
						<ValueRow
							chevron='down'
							title={
								<span className='flex flex-col gap-0.5'>
									<span className='text-[13px] font-normal text-ink-2'>
										Decaf bean
									</span>
									{beanTitle(defaultDecafBeanId)}
								</span>
							}
							onClick={() => setPicking('decaf')}
						/>
					</>
				)}
			</Sheet>

			<BeanPicker
				open={picking !== null}
				onClose={() => setPicking(null)}
				title={picking === 'decaf' ? 'Decaf bean' : 'Regular bean'}
				beans={beans}
				value={picking === 'decaf' ? defaultDecafBeanId : defaultRegularBeanId}
				onChange={(id) =>
					picking === 'decaf'
						? setDefaultDecafBeanId(id)
						: setDefaultRegularBeanId(id)
				}
			/>
		</>
	)
}
