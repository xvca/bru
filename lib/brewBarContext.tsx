import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/authContext'

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
	const { user } = useAuth()
	const [activeBarId, setActiveBarId] = useState<number | null>(null)
	const [availableBars, setAvailableBars] = useState<BrewBar[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const fetchBarsAndPreference = async () => {
		if (!user) return

		try {
			setIsLoading(true)
			const barsRes = await axios.get('/api/brew-bars', {
				headers: { Authorization: `Bearer ${user.token}` },
			})
			setAvailableBars(barsRes.data)

			const prefRes = await axios.get('/api/user/preferences', {
				headers: { Authorization: `Bearer ${user.token}` },
			})

			// if we haven't manually set a bar in this session yet, use the default
			if (activeBarId === null && prefRes.data.defaultBarId !== undefined) {
				setActiveBarId(prefRes.data.defaultBarId)
			}
		} catch (error) {
			console.error('Failed to load brew bar context', error)
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
