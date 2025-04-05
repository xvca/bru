import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface User {
	id: number
	username: string
	token: string
}

interface AuthContextType {
	user: User | null
	isLoading: boolean
	logout: () => void
	login: (userData: User) => void
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isLoading: true,
	logout: () => {},
	login: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()

	// Load user from localStorage on initial render
	useEffect(() => {
		const loadUser = () => {
			const userData = localStorage.getItem('user')
			if (userData) {
				try {
					const parsedUser = JSON.parse(userData)
					setUser(parsedUser)
				} catch (e) {
					localStorage.removeItem('user')
				}
			}
			setIsLoading(false)
		}

		loadUser()
	}, [])

	const logout = () => {
		localStorage.removeItem('user')
		setUser(null)
		router.push('/login')
	}

	const login = (userData: User) => {
		localStorage.setItem('user', JSON.stringify(userData))
		setUser(userData)
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, logout, login }}>
			{children}
		</AuthContext.Provider>
	)
}
