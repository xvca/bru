import React, { useEffect, useState } from 'react'
import Page from '@/components/Page'
import Section from '@/components/Section'
import {
	Tab,
	Listbox,
	TabGroup,
	ListboxButton,
	ListboxOptions,
	ListboxOption,
	TabList,
	TabPanels,
	TabPanel,
} from '@headlessui/react'
import { useAuth } from '@/lib/authContext'
import {
	User,
	Coffee,
	Settings as SettingsIcon,
	ChevronRight,
	ChevronDown,
} from 'lucide-react'
import ESPSettings from '@/components/ESPSettings'
import toast, { Toaster } from 'react-hot-toast'

type SettingsTab = 'account' | 'preferences' | 'esp'

const tabs = [{ id: 'esp', name: 'ESP Settings', icon: SettingsIcon }]

export default function Settings() {
	const { user } = useAuth()
	const [selectedTab, setSelectedTab] = useState(0)

	// State for account settings
	const [accountForm, setAccountForm] = useState({
		username: user?.username || '',
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	// State for preferences
	const [preferences, setPreferences] = useState({
		defaultBrewBarId: null,
	})

	useEffect(() => {
		if (user) {
			tabs.push({ id: 'account', name: 'Account', icon: User })
			tabs.push({ id: 'preferences', name: 'Preferences', icon: Coffee })
		}
	}, [user])

	const handleAccountSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		// TODO: Implement account update logic
	}

	return (
		<Page title='Settings'>
			<Toaster position='top-center' />
			<Section>
				<div className='max-w-2xl mx-auto'>
					<h1 className='text-2xl font-bold mb-6'>Settings</h1>

					<TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
						<div className='flex flex-col lg:flex-row gap-6'>
							{/* Mobile Dropdown */}
							<div className='lg:hidden w-full'>
								<Listbox value={selectedTab} onChange={setSelectedTab}>
									<div className='relative'>
										<ListboxButton className='flex items-center justify-between w-full px-4 py-2 rounded-lg bg-input-border/20 text-text'>
											<div className='flex items-center gap-2'>
												{tabs[selectedTab].icon && (
													<div>
														{React.createElement(tabs[selectedTab].icon, {
															size: 18,
														})}
													</div>
												)}
												<span>{tabs[selectedTab].name}</span>
											</div>
											<ChevronDown size={18} />
										</ListboxButton>
										<ListboxOptions className='absolute z-10 mt-1 w-full py-1 bg-background shadow-lg rounded-lg border border-input-border'>
											{tabs.map((tab, index) => (
												<ListboxOption
													key={tab.id}
													value={index}
													className={({ active }) =>
														`flex items-center px-4 py-2 cursor-pointer ${
															active
																? 'bg-input-border/50 text-text'
																: 'text-text-secondary'
														}`
													}
												>
													<div className='flex items-center gap-2'>
														{tab.icon &&
															React.createElement(tab.icon, { size: 18 })}
														<span>{tab.name}</span>
													</div>
												</ListboxOption>
											))}
										</ListboxOptions>
									</div>
								</Listbox>
							</div>

							{/* Desktop Sidebar Navigation */}
							<div className='hidden lg:block lg:w-64'>
								<TabList className='flex flex-col gap-1'>
									{tabs.map((tab, index) => (
										<Tab
											key={tab.id}
											className={({ selected }) =>
												`flex items-center justify-between w-full px-4 py-2 text-left rounded-lg transition-colors
                      ${
												selected
													? 'bg-input-border text-text'
													: 'text-text-secondary hover:bg-input-border/50'
											}`
											}
										>
											<div className='flex items-center gap-2'>
												{tab.icon &&
													React.createElement(tab.icon, { size: 18 })}
												<span>{tab.name}</span>
											</div>
											<ChevronRight size={18} />
										</Tab>
									))}
								</TabList>
							</div>

							{/* Content Panels */}
							<div className='flex-1'>
								<TabPanels>
									{/* Account Settings */}
									{user && (
										<TabPanel>
											<div>
												<form
													onSubmit={handleAccountSubmit}
													className='space-y-4'
												>
													<div>
														<label
															htmlFor='username'
															className='block text-sm font-medium mb-1'
														>
															Username
														</label>
														<input
															type='text'
															id='username'
															value={accountForm.username}
															onChange={(e) =>
																setAccountForm({
																	...accountForm,
																	username: e.target.value,
																})
															}
															className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
														/>
													</div>

													<div>
														<label
															htmlFor='currentPassword'
															className='block text-sm font-medium mb-1'
														>
															Current Password
														</label>
														<input
															type='password'
															id='currentPassword'
															value={accountForm.currentPassword}
															onChange={(e) =>
																setAccountForm({
																	...accountForm,
																	currentPassword: e.target.value,
																})
															}
															className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
														/>
													</div>

													<div>
														<label
															htmlFor='newPassword'
															className='block text-sm font-medium mb-1'
														>
															New Password
														</label>
														<input
															type='password'
															id='newPassword'
															value={accountForm.newPassword}
															onChange={(e) =>
																setAccountForm({
																	...accountForm,
																	newPassword: e.target.value,
																})
															}
															className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
														/>
													</div>

													<div>
														<label
															htmlFor='confirmPassword'
															className='block text-sm font-medium mb-1'
														>
															Confirm New Password
														</label>
														<input
															type='password'
															id='confirmPassword'
															value={accountForm.confirmPassword}
															onChange={(e) =>
																setAccountForm({
																	...accountForm,
																	confirmPassword: e.target.value,
																})
															}
															className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
														/>
													</div>

													<button
														type='submit'
														className='px-4 py-2 bg-text text-background rounded-lg'
													>
														Update Account
													</button>
												</form>
											</div>
										</TabPanel>
									)}

									{/* Preferences */}
									{user && (
										<TabPanel>
											<div>
												<div>
													<label
														htmlFor='defaultBrewBar'
														className='block text-sm font-medium mb-1'
													>
														Default Brew Bar
													</label>
													<select
														id='defaultBrewBar'
														className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background border-input-border'
													>
														<option value=''>Personal Space</option>
													</select>
												</div>

												<button className='px-4 py-2 bg-text text-background rounded-lg'>
													Save Preferences
												</button>
											</div>
										</TabPanel>
									)}

									{/* ESP Settings */}
									<TabPanel>
										<div>
											<ESPSettings />
										</div>
									</TabPanel>
								</TabPanels>
							</div>
						</div>
					</TabGroup>
				</div>
			</Section>
		</Page>
	)
}
