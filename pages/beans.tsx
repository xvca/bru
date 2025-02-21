import Page from '@/components/Page'
import Section from '@/components/Section'
import { createClient } from '@/utils/supabase/client'
import { AuthSession } from '@supabase/supabase-js'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Beans() {
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
		<Page>
			<Section>
				<h1 className='text-2xl font-bold mb-6'>Coffee Beans</h1>
				<div className='space-y-4'>
					<p>Coffee beans inventory coming soon...</p>
				</div>
			</Section>
		</Page>
	)
}
