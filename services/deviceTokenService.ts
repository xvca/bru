import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export interface DeviceTokenValidation {
	barId: number
	userId: number
	username: string
}

export async function generateDeviceToken(
	barId: number,
	userId: number,
	deviceName?: string,
): Promise<{ token: string; id: number; createdAt: Date }> {
	const token = randomBytes(32).toString('base64url')

	const deviceToken = await prisma.deviceToken.create({
		data: {
			token,
			barId,
			createdBy: userId,
			deviceName: deviceName || null,
		},
	})

	return {
		token: deviceToken.token,
		id: deviceToken.id,
		createdAt: deviceToken.createdAt,
	}
}

export async function validateDeviceToken(
	token: string,
): Promise<DeviceTokenValidation | null> {
	const deviceToken = await prisma.deviceToken.findUnique({
		where: { token },
		include: {
			user: { select: { id: true, username: true } },
			brewBar: { select: { id: true } },
		},
	})

	if (!deviceToken) {
		return null
	}

	return {
		barId: deviceToken.brewBar.id,
		userId: deviceToken.user.id,
		username: deviceToken.user.username,
	}
}

export async function getTokensForBar(barId: number) {
	return prisma.deviceToken.findMany({
		where: { barId },
		select: {
			id: true,
			deviceName: true,
			createdAt: true,
			lastUsedAt: true,
			createdBy: true,
		},
		orderBy: { createdAt: 'desc' },
	})
}

export async function revokeToken(tokenId: number) {
	return prisma.deviceToken.delete({
		where: { id: tokenId },
	})
}

export async function updateTokenLastUsed(token: string) {
	return prisma.deviceToken.update({
		where: { token },
		data: { lastUsedAt: new Date() },
	})
}
