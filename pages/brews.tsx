import Page from '@/components/Page'
import Section from '@/components/Section'
import { createClient } from '@/utils/supabase/client'
import { AuthSession } from '@supabase/supabase-js'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function Brews() {
	const router = useRouter()
	const supabase = createClient()
	const [session, setSession] = useState<AuthSession | null>(null)

	useEffect(() => {
		const getSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()

			setSession(session)

			if (!session) {
				router.push('/login')
			}
		}

		getSession()
	}, [router, supabase.auth])

	if (session === null) {
		return <div className='p-4'>Loading...</div>
	}

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
