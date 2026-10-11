import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = 'system' } = useTheme()

	return (
		<Sonner
			theme={theme as ToasterProps['theme']}
			className='toaster group'
			// Clear the status bar and the iOS blur band below it in the
			// home-screen app; the inset is 0 elsewhere
			offset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
			mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
			icons={{
				success: <CircleCheckIcon className='size-4' />,
				info: <InfoIcon className='size-4' />,
				warning: <TriangleAlertIcon className='size-4' />,
				error: <OctagonXIcon className='size-4' />,
				loading: <Loader2Icon className='size-4 animate-spin' />,
			}}
			toastOptions={{
				classNames: {
					toast:
						'group toast group-[.toaster]:bg-panel group-[.toaster]:text-ink group-[.toaster]:border-line group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:shadow-[0_18px_30px_-10px_var(--sh)]',
					description: 'group-[.toast]:text-ink-2',
					actionButton:
						'group-[.toast]:bg-accent group-[.toast]:text-on-accent',
					cancelButton: 'group-[.toast]:bg-well group-[.toast]:text-ink-2',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }
