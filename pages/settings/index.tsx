import Page, { PageHeader } from '@/components/Page'
import ESPSettings from '@/components/ESPSettings'

export default function Settings() {
	return (
		<Page title='Settings'>
			<PageHeader title='Settings' />
			<ESPSettings />
		</Page>
	)
}
