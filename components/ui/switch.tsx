import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={cn(
			'peer relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent data-[state=unchecked]:bg-line',
			className,
		)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb className='pointer-events-none block size-[26px] translate-x-[3px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.35)] transition-transform duration-150 data-[state=checked]:translate-x-[23px]' />
	</SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
