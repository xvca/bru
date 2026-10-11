import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { useEspConfig } from '@/lib/espConfigContext'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ConfirmModal'
import { TextButton } from '@/components/kit/buttons'
import { Hint, SectionLabel, SegTabs } from '@/components/kit/rows'
import { EmptyState, RowSkeleton } from '@/components/kit/states'

interface Shot {
	id: number
	targetWeight: number
	finalWeight: number
	lastFlowRate: number
	stopWeight: number
	drippage: number
}

interface ProfileShotData {
	bias: number
	shots: Shot[]
}

interface ShotDataResponse {
	p0: ProfileShotData
	p1: ProfileShotData
}

const sanitizeIp = (value: string | null) =>
	(value ?? '')
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}`

/** Integer-ish tick step giving at most ~5 intervals */
const niceStep = (max: number) => {
	const raw = max / 5
	const pow = 10 ** Math.floor(Math.log10(raw))
	const n = raw / pow
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

function ScatterPlot({
	shots,
	bias,
	lag,
}: {
	shots: Shot[]
	bias: number
	lag: number
}) {
	const W = 350
	const H = 210
	const left = 34
	const right = 346
	const top = 15
	const bottom = 190

	const xMax = Math.max(
		1,
		Math.ceil(Math.max(...shots.map((s) => s.lastFlowRate))),
	)
	const yTop = Math.max(1, ...shots.map((s) => s.drippage), xMax * lag + bias)
	const yStep = niceStep(yTop)
	const yMax = Math.ceil(yTop / yStep) * yStep
	const xStep = niceStep(xMax) < 1 ? 1 : niceStep(xMax)

	const X = (f: number) => left + (f / xMax) * (right - left)
	const Y = (v: number) => bottom - (Math.max(0, v) / yMax) * (bottom - top)

	const yTicks = Array.from(
		{ length: Math.round(yMax / yStep) + 1 },
		(_, i) => i * yStep,
	)
	const xTicks = Array.from(
		{ length: Math.floor(xMax / xStep) + 1 },
		(_, i) => i * xStep,
	)

	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className='block h-auto w-full'
			role='img'
			aria-label='Drippage against flow rate, with the fitted line'
		>
			{yTicks.map((v) => (
				<g key={`y${v}`}>
					<line x1={left} x2={right} y1={Y(v)} y2={Y(v)} stroke='var(--line)' />
					<text
						x={left - 6}
						y={Y(v) + 4}
						textAnchor='end'
						fontSize='11'
						fill='var(--ink-2)'
						className='font-mono'
					>
						{Number(v.toFixed(2))}
					</text>
				</g>
			))}
			{xTicks.map((v) => (
				<text
					key={`x${v}`}
					x={X(v)}
					y={H - 6}
					textAnchor='middle'
					fontSize='11'
					fill='var(--ink-2)'
					className='font-mono'
				>
					{v}
				</text>
			))}
			<line
				x1={X(0)}
				y1={Y(bias)}
				x2={X(xMax)}
				y2={Y(xMax * lag + bias)}
				stroke='var(--ink)'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			{shots.map((s) => (
				<circle
					key={s.id}
					cx={X(s.lastFlowRate)}
					cy={Y(s.drippage)}
					r='5'
					fill='var(--accent)'
					fillOpacity='.85'
				>
					<title>{`#${s.id}: ${s.lastFlowRate.toFixed(2)} g/s, ${s.drippage.toFixed(2)} g drippage, ${s.finalWeight.toFixed(2)} g final`}</title>
				</circle>
			))}
		</svg>
	)
}

export default function ShotHistory() {
	const { espIp, prefs, isReady } = useEspConfig()
	const ip = sanitizeIp(espIp)
	const api = useMemo(
		() => (ip ? axios.create({ baseURL: `http://${ip}` }) : null),
		[ip],
	)

	const [data, setData] = useState<ShotDataResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [failed, setFailed] = useState(false)
	const [profile, setProfile] = useState<'p0' | 'p1'>('p0')
	const [confirmReset, setConfirmReset] = useState(false)

	const fetchShotData = useCallback(async () => {
		if (!api) return
		setIsLoading(true)
		setFailed(false)
		try {
			const { data } = await api.get<ShotDataResponse>('/data', {
				timeout: 5000,
			})
			setData(data)
			if (data.p0.shots.length === 0 && data.p1.shots.length > 0)
				setProfile('p1')
		} catch (error) {
			setFailed(true)
			toast.error('Failed to fetch shot data')
		} finally {
			setIsLoading(false)
		}
	}, [api])

	useEffect(() => {
		void fetchShotData()
	}, [fetchShotData])

	const clearShotData = async () => {
		if (!api) {
			toast.error('Configure your ESP IP first.')
			return
		}

		try {
			await api.post('/clear-data')
			toast.success('All data cleared')
			await fetchShotData()
		} catch (error) {
			toast.error('Failed to clear data')
		}
	}

	if (isReady && !api) {
		return (
			<div className='px-5'>
				<EmptyState
					className='mt-4'
					title='No machine set up'
					body='Add your Autobru address in Settings to see its shot history.'
				/>
			</div>
		)
	}

	if (isLoading && !data) {
		return (
			<div className='px-5 pt-4'>
				<RowSkeleton rows={5} variant='simple' />
			</div>
		)
	}

	if (failed && !data) {
		return (
			<div className='px-5'>
				<EmptyState
					className='mt-4'
					title="Couldn't reach the machine"
					body='Check it is awake and on the same network, then try again.'
					action={
						<TextButton underline onClick={fetchShotData} className='-ml-1'>
							Try again
						</TextButton>
					}
				/>
			</div>
		)
	}

	if (!data) return null

	const lag = prefs?.systemLag ?? 1
	const current = data[profile]
	const allShots = [...data.p0.shots, ...data.p1.shots].sort(
		(a, b) => b.id - a.id,
	)

	return (
		<div className='px-5 pt-2 pb-6'>
			<div className='flex h-[72px] border-y border-line'>
				{[
					{ label: 'Single bias', value: signed(data.p0.bias), unit: 'g' },
					{ label: 'Double bias', value: signed(data.p1.bias), unit: 'g' },
					{
						label: 'System lag',
						value: prefs?.systemLag?.toFixed(2) ?? '–',
						unit: 's',
					},
				].map((s, i) => (
					<div
						key={s.label}
						className={cn(
							'flex flex-1 flex-col justify-center gap-1',
							i > 0 && 'border-l border-line pl-3.5',
						)}
					>
						<span className='text-[13px] leading-[18px] text-ink-2'>
							{s.label}
						</span>
						<span className='font-mono text-[22px] font-medium'>
							{s.value}
							<span className='text-[12px] text-ink-2'> {s.unit}</span>
						</span>
					</div>
				))}
			</div>

			{allShots.length === 0 ? (
				<EmptyState
					className='mt-6 border-t-0'
					title='No shots recorded yet'
					body='Pull a few shots with Autobru and it will start learning your drippage bias.'
				/>
			) : (
				<>
					<SegTabs
						className='mt-[18px]'
						value={profile}
						onChange={setProfile}
						options={[
							{ value: 'p0', label: 'Single' },
							{ value: 'p1', label: 'Double' },
						]}
					/>

					<Hint className='mt-3.5 mb-1'>
						Flow vs drippage. The line is the fit the machine uses to stop
						early.
					</Hint>
					{current.shots.length > 0 ? (
						<>
							<ScatterPlot
								shots={current.shots}
								bias={current.bias}
								lag={lag}
							/>
							<div className='ml-[34px] flex justify-between text-[13px] text-ink-2'>
								<span>Flow rate (g/s)</span>
								<span>Drippage (g) up</span>
							</div>
						</>
					) : (
						<div className='flex h-40 items-center text-[14px] text-ink-2'>
							No {profile === 'p0' ? 'single' : 'double'} shots yet.
						</div>
					)}

					<SectionLabel className='mt-[22px]'>Shots</SectionLabel>
					<table className='w-full border-collapse'>
						<thead>
							<tr className='text-[12.5px] text-ink-2'>
								<th className='py-2 text-left font-medium'>#</th>
								<th className='py-2 text-right font-medium'>Target</th>
								<th className='py-2 text-right font-medium'>Final</th>
								<th className='py-2 text-right font-medium'>Flow</th>
							</tr>
						</thead>
						<tbody className='font-mono text-[15px]'>
							{allShots.map((s) => (
								<tr key={s.id} className='h-11 border-t border-line'>
									<td className='text-left text-ink-2'>#{s.id}</td>
									<td className='text-right'>{s.targetWeight.toFixed(1)}</td>
									<td
										className={cn(
											'text-right',
											Math.abs(s.finalWeight - s.targetWeight) > 0.2
												? 'text-danger'
												: 'text-green',
										)}
									>
										{s.finalWeight.toFixed(1)}
									</td>
									<td className='text-right'>{s.lastFlowRate.toFixed(1)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}

			<TextButton
				tone='danger'
				onClick={() => setConfirmReset(true)}
				className='mt-[22px] -ml-1'
			>
				Reset all data and biases
			</TextButton>

			<ConfirmModal
				open={confirmReset}
				onClose={() => setConfirmReset(false)}
				onConfirm={clearShotData}
				title='Clear all data?'
				description='This clears all shot data and resets the learned biases to their defaults.'
				confirmLabel='Clear data'
			/>
		</div>
	)
}
