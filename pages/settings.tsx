import React, { useEffect, useState, useMemo } from 'react'
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
import AccountSettings from '@/components/AccountSettings'
import PreferencesSettings from '@/components/PreferencesSettings'

export default function Settings() {
	const { user } = useAuth()
	const [selectedTab, setSelectedTab] = useState(0)

	const [accountForm, setAccountForm] = useState({
		username: user?.username || '',
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})

	const tabs = useMemo(() => {
		const items = []

		if (user) {
			items.push({
				id: 'account',
				name: 'Account',
				icon: User,
				content: <AccountSettings />,
			})

			items.push({
				id: 'preferences',
				name: 'Preferences',
				icon: Coffee,
				content: <PreferencesSettings />,
			})
		}

		items.push({
			id: 'esp',
			name: 'ESP Settings',
			icon: SettingsIcon,
			content: <ESPSettings />,
		})

		return items
	}, [user, accountForm])

	useEffect(() => {
		setSelectedTab(0)
	}, [user])

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
												{tabs[selectedTab]?.icon && (
													<div>
														{React.createElement(tabs[selectedTab].icon, {
															size: 18,
														})}
													</div>
												)}
												<span>{tabs[selectedTab]?.name}</span>
											</div>
											<ChevronDown size={18} />
										</ListboxButton>
										<ListboxOptions className='absolute z-10 mt-1 w-full py-1 bg-background shadow-lg rounded-lg border border-input-border'>
											{tabs.map((tab, index) => (
												<ListboxOption
													key={tab.id}
													value={index}
													className={({ focus }) =>
														`flex items-center px-4 py-2 cursor-pointer ${
															focus
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
									{tabs.map((tab) => (
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

							{/* Content Panels - Dynamic Rendering */}
							<div className='flex-1'>
								<TabPanels>
									{tabs.map((tab) => (
										<TabPanel key={tab.id}>
											{/* Render the content defined in the array */}
											{tab.content}
										</TabPanel>
									))}
								</TabPanels>
							</div>
						</div>
					</TabGroup>
				</div>
			</Section>
		</Page>
	)
}
