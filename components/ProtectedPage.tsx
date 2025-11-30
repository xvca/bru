import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/authContext'
import Page from '@/components/Page'
import { Spinner } from '@/components/ui/spinner'

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
			<Page title='Loading...'>
				<div className='flex h-[50vh] w-full items-center justify-center'>
					<Spinner className='h-8 w-8 text-muted-foreground' />
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
