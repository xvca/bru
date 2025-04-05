// components/ProtectedPage.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/authContext'
import Page from '@/components/Page'
import { Loader2 } from 'lucide-react'

interface ProtectedPageProps {
	title?: string
	children: React.ReactNode
}

const ProtectedPage = ({ title, children }: ProtectedPageProps) => {
	const { user, isLoading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (!isLoading && !user) {
			router.replace('/login')
		}
	}, [user, isLoading, router])

	if (isLoading) {
		return (
			<Page title='Loading'>
				<div className='flex justify-center items-center h-40'>
					<Loader2 className='w-8 h-8 animate-spin' />
				</div>
			</Page>
		)
	}

	if (!user) {
		return null // Don't render anything while redirecting
	}

	return <Page title={title}>{children}</Page>
}

export default ProtectedPage
