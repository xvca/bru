import Page from '@/components/Page'
import Section from '@/components/Section'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function Brews() {
	const router = useRouter()

	return (
		<Page title='Brews'>
			<Section>
				<h1 className='text-2xl font-bold mb-6'>Brew Logs</h1>
				<div className='space-y-4'>
					<p>Brew logs coming soon...</p>
				</div>
			</Section>
		</Page>
	)
}
