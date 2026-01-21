import { prisma } from '@/lib/prisma'

export interface AutoBrewInput {
	yieldWeight: number
	brewTime: number
	targetWeight: number
	isDecaf: boolean
}

export async function createAutoBrewFromDevice(
	input: AutoBrewInput,
	barId: number,
	userId: number,
) {
	return prisma.$transaction(async (tx) => {
		const brewBar = await tx.brewBar.findUnique({
			where: { id: barId },
			include: {
				defaultRegularBean: true,
				defaultDecafBean: true,
			},
		})

		if (!brewBar) {
			throw new Error('Brew bar not found')
		}

		const defaultBean = input.isDecaf
			? brewBar.defaultDecafBean
			: brewBar.defaultRegularBean

		if (!defaultBean) {
			throw new Error(
				`No default ${input.isDecaf ? 'decaf' : 'regular'} bean configured for this brew bar`,
			)
		}

		const lastBrew = await tx.brew.findFirst({
			where: {
				beanId: defaultBean.id,
				method: 'Espresso',
				barId: barId,
			},
			orderBy: { createdAt: 'desc' },
		})

		const doseWeight = lastBrew?.doseWeight ?? input.targetWeight / 2

		const brew = await tx.brew.create({
			data: {
				userId: userId,
				beanId: defaultBean.id,
				barId: barId,
				method: 'Espresso',
				yieldWeight: input.yieldWeight,
				brewTime: input.brewTime,
				doseWeight: doseWeight,
				grindSize: lastBrew?.grindSize ?? null,
				waterTemperature: lastBrew?.waterTemperature ?? null,
				grinderId: lastBrew?.grinderId ?? null,
				brewerId: lastBrew?.brewerId ?? null,
				autoCreated: true,
			},
		})

		if (defaultBean.remainingWeight !== null) {
			const newWeight = Math.max(0, defaultBean.remainingWeight - doseWeight)
			await tx.bean.update({
				where: { id: defaultBean.id },
				data: { remainingWeight: newWeight },
			})
		}

		return brew
	})
}
