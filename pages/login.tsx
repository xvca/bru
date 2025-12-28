import Page from '@/components/Page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Login from '@/components/Login'
import Signup from '@/components/Signup'

export default function LoginPage() {
	return (
		<Page title='Login'>
			<div className='p-6'>
				<div className='max-w-md mx-auto mt-8'>
					<h1 className='text-2xl font-bold mb-6 text-center'>
						Welcome to Bru
					</h1>

					<Tabs defaultValue='login' className='w-full'>
						<TabsList className='grid w-full grid-cols-2 mb-6'>
							<TabsTrigger value='login'>Login</TabsTrigger>
							<TabsTrigger value='signup'>Sign Up</TabsTrigger>
						</TabsList>
						<TabsContent value='login'>
							<Login />
						</TabsContent>
						<TabsContent value='signup'>
							<Signup />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</Page>
	)
}
