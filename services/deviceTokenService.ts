import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export async function generateDeviceToken(deviceName?: string) {
	const token = randomBytes(32).toString('base64url')
	const created = await prisma.deviceToken.create({
		data: { token, deviceName: deviceName || null },
	})
	return { token, id: created.id, createdAt: created.createdAt }
}

export async function validateDeviceToken(token: string) {
	const deviceToken = await prisma.deviceToken.findUnique({
		where: { token },
		select: { id: true },
	})
	return deviceToken
}

export function revokeDeviceTokens() {
	return prisma.deviceToken.deleteMany()
}

export function updateTokenLastUsed(token: string) {
	return prisma.deviceToken.update({
		where: { token },
		data: { lastUsedAt: new Date() },
	})
}
