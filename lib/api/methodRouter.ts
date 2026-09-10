import type { NextApiRequest, NextApiResponse } from 'next'
import { ZodError } from 'zod'
import { ApiError } from './validation'

type Handler<Req = NextApiRequest> = (
	req: Req,
	res: NextApiResponse,
) => unknown | Promise<unknown>

type MethodMap<Req = NextApiRequest> = Partial<
	Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', Handler<Req>>
>

function prismaErrorCode(error: unknown) {
	if (!error || typeof error !== 'object' || !('code' in error)) return null
	return error.code
}

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
			if (error instanceof ApiError) {
				res.status(error.status).json({ error: error.message })
				return
			}
			if (error instanceof ZodError) {
				res
					.status(400)
					.json({ error: 'Invalid data', details: error.flatten().fieldErrors })
				return
			}
			const code = prismaErrorCode(error)
			if (code === 'P2025') {
				res.status(404).json({ error: 'Record not found' })
				return
			}
			if (code === 'P2002' || code === 'P2003') {
				res.status(409).json({ error: 'Conflicting or linked record' })
				return
			}
			console.error('API error:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	}
}
