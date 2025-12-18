import React, { useState, useMemo, useEffect } from 'react'
import Page from '@/components/Page'
import Section from '@/components/Section'
import { useAuth } from '@/lib/authContext'
import {
	User,
	Coffee,
	Settings as SettingsIcon,
	ChevronRight,
} from 'lucide-react'
import ESPSettings from '@/components/ESPSettings'
import AccountSettings from '@/components/AccountSettings'
import PreferencesSettings from '@/components/PreferencesSettings'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export default function Settings() {
	const { user } = useAuth()

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
	}, [user])

	const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'esp')

	useEffect(() => {
		const exists = tabs.find((t) => t.id === activeTab)
		if (!exists && tabs.length > 0) {
			setActiveTab(tabs[0].id)
		}
	}, [user, tabs, activeTab])

	return (
		<Page title='Settings'>
			<Section>
				<div className='max-w-4xl mx-auto p-6'>
					<h1 className='text-2xl font-bold mb-6'>Settings</h1>

					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						orientation='vertical'
						className='flex flex-col lg:flex-row gap-6'
					>
						<div className='lg:hidden w-full'>
							<Select value={activeTab} onValueChange={setActiveTab}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Select setting'>
										<div className='flex items-center gap-2'>
											{tabs.find((t) => t.id === activeTab)?.icon &&
												React.createElement(
													tabs.find((t) => t.id === activeTab)!.icon,
													{ size: 16 },
												)}
											<span>{tabs.find((t) => t.id === activeTab)?.name}</span>
										</div>
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{tabs.map((tab) => (
										<SelectItem key={tab.id} value={tab.id}>
											<div className='flex items-center gap-2'>
												{tab.icon && <tab.icon size={16} />}
												<span>{tab.name}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Separator className='mt-6' />
						</div>

						<TabsList className='hidden lg:flex flex-col justify-start h-auto w-64 bg-transparent p-0 space-y-1 shrink-0'>
							{tabs.map((tab) => (
								<TabsTrigger
									key={tab.id}
									value={tab.id}
									className='w-full justify-start px-4 py-2 h-auto data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none font-medium'
								>
									<div className='flex items-center gap-2 w-full'>
										{tab.icon && <tab.icon size={18} />}
										<span className='flex-1 text-left'>{tab.name}</span>
										{activeTab === tab.id && (
											<ChevronRight
												size={16}
												className='text-muted-foreground'
											/>
										)}
									</div>
								</TabsTrigger>
							))}
						</TabsList>

						<div className='flex-1'>
							{tabs.map((tab) => (
								<TabsContent key={tab.id} value={tab.id} className='mt-0'>
									{tab.content}
								</TabsContent>
							))}
						</div>
					</Tabs>
				</div>
			</Section>
		</Page>
	)
}
