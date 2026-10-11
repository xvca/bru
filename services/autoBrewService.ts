import { prisma } from '@/lib/prisma'
import { drawFromBag } from '@/services/beanService'

export interface AutoBrewInput {
	yieldWeight: number
	brewTime: number
	isDecaf: boolean
}

export function createAutoBrewFromDevice(input: AutoBrewInput) {
	return prisma.$transaction(async (tx) => {
		const settings = await tx.appSettings.findUnique({
			where: { id: 1 },
			include: { defaultRegularBean: true, defaultDecafBean: true },
		})
		const defaultBean = input.isDecaf
			? settings?.defaultDecafBean
			: settings?.defaultRegularBean
		if (!defaultBean) {
			throw new Error(
				`No default ${input.isDecaf ? 'decaf' : 'regular'} bean configured`,
			)
		}

		const lastBrew = await tx.brew.findFirst({
			where: {
				...(defaultBean.batchId
					? { bean: { batchId: defaultBean.batchId } }
					: { beanId: defaultBean.id }),
				method: 'Espresso',
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		})
		const doseWeight = lastBrew?.doseWeight ?? input.yieldWeight / 2

		const brew = await tx.brew.create({
			data: {
				beanId: defaultBean.id,
				method: 'Espresso',
				yieldWeight: input.yieldWeight,
				brewTime: input.brewTime,
				doseWeight,
				grindSize: lastBrew?.grindSize ?? null,
				waterTemperature: lastBrew?.waterTemperature ?? null,
				grinderId: lastBrew?.grinderId ?? null,
				brewerId: lastBrew?.brewerId ?? null,
				autoCreated: true,
			},
		})

		const weights = drawFromBag(defaultBean, doseWeight)
		if (weights) {
			await tx.bean.update({ where: { id: defaultBean.id }, data: weights })
		}
		return brew
	})
}
