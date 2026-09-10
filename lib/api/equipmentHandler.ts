import { withLocalAccess } from './localRoute'
import { createApiHandler } from './methodRouter'
import { ApiError, parseId } from './validation'

interface EquipmentService {
	list: () => Promise<unknown>
	get: (id: number) => Promise<unknown>
	create: (data: unknown) => Promise<unknown>
	update: (id: number, data: unknown) => Promise<unknown>
	remove: (id: number) => Promise<unknown>
}

export function createEquipmentCollectionHandler(service: EquipmentService) {
	return withLocalAccess(
		createApiHandler({
			GET: async (_req, res) => res.json(await service.list()),
			POST: async (req, res) => {
				const item = await service.create(req.body)
				res.status(201).json(item)
			},
		}),
	)
}

export function createEquipmentDetailHandler(service: EquipmentService) {
	return withLocalAccess(
		createApiHandler({
			GET: async (req, res) => {
				const item = await service.get(parseId(req.query.id))
				if (!item) throw new ApiError(404, 'Equipment not found')
				res.json(item)
			},
			PUT: async (req, res) => {
				res.json(await service.update(parseId(req.query.id), req.body))
			},
			DELETE: async (req, res) => {
				await service.remove(parseId(req.query.id))
				res.status(204).end()
			},
		}),
	)
}
