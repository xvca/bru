import Page from '@/components/Page'
import Section from '@/components/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Beans() {
	const router = useRouter()

	return (
		<Page title='Beans'>
			<Section>
				<h1 className='text-2xl font-bold mb-6'>Coffee Beans</h1>
				<div className='space-y-4'>
					<p>Coffee beans inventory coming soon...</p>
				</div>
			</Section>
		</Page>
	)
}
