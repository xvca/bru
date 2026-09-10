import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api/validation'
import { preferencesSchema } from '@/lib/validators'

const autoLoggingSchema = z.object({
	defaultRegularBeanId: z.number().int().positive().nullable(),
	defaultDecafBeanId: z.number().int().positive().nullable(),
})

export function getSettings() {
	return prisma.appSettings.upsert({
		where: { id: 1 },
		create: { id: 1 },
		update: {},
	})
}

export function updatePreferences(input: unknown) {
	const data = preferencesSchema.parse(input)
	return prisma.appSettings.upsert({
		where: { id: 1 },
		create: { id: 1, ...data },
		update: data,
	})
}

export async function updateAutoLoggingBeans(input: unknown) {
	const data = autoLoggingSchema.parse(input)
	for (const beanId of [data.defaultRegularBeanId, data.defaultDecafBeanId]) {
		if (beanId && !(await prisma.bean.findUnique({ where: { id: beanId } }))) {
			throw new ApiError(400, 'Default bean not found')
		}
	}
	return prisma.appSettings.upsert({
		where: { id: 1 },
		create: { id: 1, ...data },
		update: data,
	})
}
