import Head from 'next/head'
import Appbar from '@/components/Appbar'

interface Props {
	title?: string
	children: React.ReactNode
}

const Page = ({ title, children }: Props) => (
	<>
		{title ? (
			<Head>
				<title>{`Bru | ${title}`}</title>
			</Head>
		) : null}

		<Appbar />

		<main className='mx-auto max-w-screen-md pt-12 pb-10 px-safe sm:pb-0 bg-background text-text'>
			<div className='p-6'>{children}</div>
		</main>
	</>
)

export default Page
