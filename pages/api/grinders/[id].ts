import { createEquipmentDetailHandler } from '@/lib/api/equipmentHandler'
import {
	getGrinders,
	getGrinderById,
	createGrinder,
	updateGrinder,
	deleteGrinder,
} from '@/services/grinderService'
export default createEquipmentDetailHandler({
	list: getGrinders,
	get: getGrinderById,
	create: createGrinder,
	update: updateGrinder,
	remove: deleteGrinder,
})
