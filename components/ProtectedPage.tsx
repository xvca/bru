import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/authContext'
import Page from '@/components/Page'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

interface ProtectedPageProps {
	title?: string
	children: React.ReactNode
}

const ProtectedPage = ({ title, children }: ProtectedPageProps) => {
	const { user, isLoading, sessionError, refreshSession } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (!isLoading && !user && !sessionError) {
			router.replace('/login')
		}
	}, [user, isLoading, sessionError, router])

	if (isLoading) {
		return (
			<Page title='Loading...'>
				<div className='flex h-[50vh] w-full items-center justify-center'>
					<Spinner className='h-8 w-8 text-muted-foreground' />
				</div>
			</Page>
		)
	}

	if (!user && sessionError) {
		return (
			<Page title='Connection problem'>
				<div className='flex flex-col items-center gap-4 px-6 py-12 text-center'>
					<p className='max-w-sm text-muted-foreground'>{sessionError}</p>
					<Button onClick={() => void refreshSession()}>Try again</Button>
				</div>
			</Page>
		)
	}

	if (!user) {
		return null
	}

	return <Page title={title}>{children}</Page>
}

export default ProtectedPage
