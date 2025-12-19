import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

type Handler<Req = NextApiRequest> = (
	req: Req,
	res: NextApiResponse,
) => unknown | Promise<unknown>

type MethodMap<Req = NextApiRequest> = Partial<
	Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', Handler<Req>>
>

export function createApiHandler<Req extends NextApiRequest = NextApiRequest>(
	methodMap: MethodMap<Req>,
): (req: Req, res: NextApiResponse) => Promise<void> {
	return async (req, res) => {
		const handler = methodMap[req.method as keyof MethodMap<Req>]

		if (!handler) {
			res.setHeader('Allow', Object.keys(methodMap))
			res.status(405).json({ error: 'Method Not Allowed' })
			return
		}

		try {
			await handler(req, res)
		} catch (error) {
			console.error('API error:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	}
}
