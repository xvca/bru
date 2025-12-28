import type { NextApiResponse } from 'next'
import { createApiHandler } from '@/lib/api/methodRouter'
import { getBeanById, updateBean, deleteBean } from '@/services/beanService'
import { withAuth, type AuthRequest } from '@/lib/auth'

async function handleGet(req: AuthRequest, res: NextApiResponse) {
	const id = Number(req.query.id)
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

	const bean = await getBeanById(id)
	if (!bean) return res.status(404).json({ error: 'Bean not found' })

	return res.status(200).json(bean)
}

async function handlePut(req: AuthRequest, res: NextApiResponse) {
	const id = Number(req.query.id)
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

	const bean = await updateBean(id, req.body)
	return res.status(200).json(bean)
}

async function handleDelete(req: AuthRequest, res: NextApiResponse) {
	const id = Number(req.query.id)
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

	try {
		await deleteBean(id)
		return res.status(204).end()
	} catch (error: any) {
		if (error.message.includes('existing brews')) {
			return res.status(409).json({ error: error.message })
		}
		throw error
	}
}

export default withAuth(
	createApiHandler<AuthRequest>({
		GET: handleGet,
		PUT: handlePut,
		DELETE: handleDelete,
	}),
)
