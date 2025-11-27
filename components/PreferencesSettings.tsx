import { Button } from './ui/button'

export default function PreferencesSettings() {
	return (
		<div>
			<div className='mb-2'>
				<label htmlFor='defaultBrewBar' className='text-sm font-medium'>
					Default Brew Bar
				</label>
				<select
					id='defaultBrewBar'
					className='w-full px-3 py-2 border rounded-lg'
				>
					<option value=''>Personal Space</option>
				</select>
			</div>
			<Button>Save Preferences</Button>
		</div>
	)
}
