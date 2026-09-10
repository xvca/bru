import Page from '@/components/Page'
import Section from '@/components/Section'
import ESPSettings from '@/components/ESPSettings'

export default function Settings() {
	return (
		<Page title='Settings'>
			<Section>
				<div className='max-w-4xl mx-auto p-6'>
					<h1 className='text-2xl font-bold mb-6'>Settings</h1>
					<ESPSettings />
				</div>
			</Section>
		</Page>
	)
}
