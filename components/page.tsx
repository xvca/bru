import Head from 'next/head'
import Appbar from '@/components/appbar'

interface Props {
	title?: string
	children: React.ReactNode
}

const Page = ({ title, children }: Props) => (
	<>
		{title ? (
			<Head>
				<title>bru | {title}</title>
			</Head>
		) : null}

		<Appbar />

		<main
			/**
			 * Padding top = `appbar` height
			 * Padding bottom = `bottom-nav` height
			 */
			className='mx-auto max-w-screen-md pt-12 pb-10 px-safe sm:pb-0'
		>
			<div className='p-6'>{children}</div>
		</main>
	</>
)

export default Page
