import { createEquipmentCollectionHandler } from '@/lib/api/equipmentHandler'
import {
	getBrewers,
	getBrewerById,
	createBrewer,
	updateBrewer,
	deleteBrewer,
} from '@/services/brewerService'
export default createEquipmentCollectionHandler({
	list: getBrewers,
	get: getBrewerById,
	create: createBrewer,
	update: updateBrewer,
	remove: deleteBrewer,
})
