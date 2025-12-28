import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'
import { toast } from 'sonner'

interface BrewBar {
	id: number
	name: string
	role: string
}

interface BrewBarContextType {
	activeBarId: number | null
	setActiveBarId: (id: number | null) => void
	availableBars: BrewBar[]
	isLoading: boolean
	refreshBars: () => Promise<void>
}

const BrewBarContext = createContext<BrewBarContextType>({
	activeBarId: null,
	setActiveBarId: () => {},
	availableBars: [],
	isLoading: true,
	refreshBars: async () => {},
})

export const useBrewBar = () => useContext(BrewBarContext)

export const BrewBarProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user, logout } = useAuth()
	const [activeBarId, setActiveBarId] = useState<number | null>(null)
	const [availableBars, setAvailableBars] = useState<BrewBar[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const fetchBarsAndPreference = async () => {
		if (!user) return

		try {
			setIsLoading(true)

			const headers = { Authorization: `Bearer ${user.token}` }

			const [barsRes, prefRes] = await Promise.all([
				axios.get('/api/brew-bars', {
					headers,
				}),
				axios.get('/api/user/preferences', {
					headers,
				}),
			])

			setAvailableBars(barsRes.data)

			// if we haven't manually set a bar in this session yet, use the default
			if (activeBarId === null && prefRes.data.defaultBarId !== undefined) {
				setActiveBarId(prefRes.data.defaultBarId)
			}
		} catch (error) {
			console.error('Failed to load brew bar context', error)
			toast.error(
				'Failed to load your brew bars and preferences. Logging you out to refresh session.',
			)
			logout()
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		if (user) {
			fetchBarsAndPreference()
		} else {
			setAvailableBars([])
			setActiveBarId(null)
		}
	}, [user])

	return (
		<BrewBarContext.Provider
			value={{
				activeBarId,
				setActiveBarId,
				availableBars,
				isLoading,
				refreshBars: fetchBarsAndPreference,
			}}
		>
			{children}
		</BrewBarContext.Provider>
	)
}
