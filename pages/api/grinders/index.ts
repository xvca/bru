import { createEquipmentCollectionHandler } from '@/lib/api/equipmentHandler'
import {
	getGrinders,
	getGrinderById,
	createGrinder,
	updateGrinder,
	deleteGrinder,
} from '@/services/grinderService'
export default createEquipmentCollectionHandler({
	list: getGrinders,
	get: getGrinderById,
	create: createGrinder,
	update: updateGrinder,
	remove: deleteGrinder,
})
