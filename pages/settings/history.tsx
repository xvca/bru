import Page, { PageHeader } from '@/components/Page'
import ShotHistory from '@/components/ShotHistory'
import { BackLink } from '@/components/kit/buttons'

export default function ShotHistoryPage() {
	return (
		<Page title='Shot history'>
			<PageHeader
				title='Shot history'
				back={<BackLink href='/settings'>Settings</BackLink>}
			/>
			<ShotHistory />
		</Page>
	)
}
