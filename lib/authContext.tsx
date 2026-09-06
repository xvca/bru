import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { toast } from 'sonner'
import { installSessionInterceptors, type SessionUser } from './authClient'

interface AuthContextType {
	user: SessionUser | null
	isLoading: boolean
	sessionError: string | null
	refreshSession: () => Promise<void>
	logout: () => Promise<void>
	login: (data: SessionUser | { user: SessionUser }) => void
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isLoading: true,
	sessionError: null,
	refreshSession: async () => {},
	logout: async () => {},
	login: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<SessionUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [sessionError, setSessionError] = useState<string | null>(null)
	const version = useRef(0)
	const currentUser = useRef<SessionUser | null>(null)
	const pendingCheck = useRef<Promise<void> | null>(null)
	const signingOut = useRef(false)
	const router = useRouter()

	const applyUser = useCallback((next: SessionUser | null) => {
		if (
			next?.id !== currentUser.current?.id ||
			next?.username !== currentUser.current?.username
		)
			setUser(next)
		currentUser.current = next
	}, [])

	const invalidateSession = useCallback(() => {
		const wasSignedIn = currentUser.current !== null
		version.current++
		applyUser(null)
		setSessionError(null)
		setIsLoading(false)
		if (wasSignedIn)
			toast.error('Your session has expired. Please sign in again.')
	}, [applyUser])

	const refreshSession = useCallback(async () => {
		if (process.env.NEXT_PUBLIC_LITE === 'true' || signingOut.current) return
		if (pendingCheck.current) return pendingCheck.current
		const requestVersion = version.current
		const check = async () => {
			try {
				const { data } = await axios.get('/api/auth/session', { timeout: 5000 })
				if (requestVersion !== version.current) return
				if (
					!Number.isInteger(data?.user?.id) ||
					data.user.id <= 0 ||
					typeof data.user.username !== 'string'
				) {
					throw new Error('Invalid session response')
				}
				// A different tab may have signed in since older requests began.
				version.current++
				applyUser({ id: data.user.id, username: data.user.username })
				setSessionError(null)
				setIsLoading(false)
			} catch (error) {
				if (requestVersion !== version.current) return
				if (
					axios.isAxiosError(error) &&
					error.response?.status === 401 &&
					error.response?.data?.code === 'SESSION_INVALID'
				) {
					invalidateSession()
				} else {
					setSessionError(
						'Unable to check your session. Check your connection and try again.',
					)
				}
			} finally {
				if (requestVersion === version.current) setIsLoading(false)
			}
		}
		pendingCheck.current = check()
		try {
			await pendingCheck.current
		} finally {
			pendingCheck.current = null
		}
	}, [applyUser, invalidateSession])

	useEffect(() => {
		// Retire the old browser-readable bearer token. Session credentials now
		// live only in an HttpOnly cookie, not localStorage or React state.
		localStorage.removeItem('user')
		if (process.env.NEXT_PUBLIC_LITE === 'true') {
			setIsLoading(false)
			return
		}
		const cleanup = installSessionInterceptors(
			() => version.current,
			invalidateSession,
		)
		void refreshSession()
		const resume = () => {
			if (document.visibilityState === 'visible') void refreshSession()
		}
		window.addEventListener('online', resume)
		window.addEventListener('focus', resume)
		document.addEventListener('visibilitychange', resume)
		return () => {
			cleanup()
			window.removeEventListener('online', resume)
			window.removeEventListener('focus', resume)
			document.removeEventListener('visibilitychange', resume)
		}
	}, [invalidateSession, refreshSession])

	const login = useCallback(
		(data: SessionUser | { user: SessionUser }) => {
			version.current++
			applyUser('user' in data ? data.user : data)
			setSessionError(null)
			setIsLoading(false)
		},
		[applyUser],
	)

	const logout = useCallback(async () => {
		if (signingOut.current) return
		signingOut.current = true
		version.current++
		try {
			await pendingCheck.current
			await axios.post('/api/auth/logout', {}, { timeout: 5000 })
			applyUser(null)
			setSessionError(null)
			setIsLoading(false)
			await router.push('/login')
		} catch {
			toast.error('Unable to sign out. Check your connection and try again.')
		} finally {
			signingOut.current = false
		}
	}, [applyUser, router])

	return (
		<AuthContext.Provider
			value={{ user, isLoading, sessionError, refreshSession, logout, login }}
		>
			{children}
		</AuthContext.Provider>
	)
}
