import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function updateUserAccount(
	userId: number,
	data: {
		username?: string
		currentPassword: string
		newPassword?: string
	},
) {
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) {
		throw new Error('User not found')
	}

	const isPasswordValid = await bcrypt.compare(
		data.currentPassword,
		user.password,
	)
	if (!isPasswordValid) {
		throw new Error('Invalid current password')
	}

	if (data.username && data.username !== user.username) {
		const existingUser = await prisma.user.findUnique({
			where: { username: data.username },
		})
		if (existingUser) {
			throw new Error('Username already taken')
		}
	}

	const updateData: any = {}
	if (data.username) {
		updateData.username = data.username
	}
	if (data.newPassword) {
		updateData.password = await bcrypt.hash(data.newPassword, 10)
	}

	return prisma.user.update({
		where: { id: userId },
		data: updateData,
		select: {
			id: true,
			username: true,
			createdAt: true,
		},
	})
}

export async function checkUsernameAvailability(username: string) {
	const user = await prisma.user.findUnique({ where: { username } })
	return !user
}

export async function getUserById(userId: number) {
	return prisma.user.findUnique({
		where: { id: userId },
	})
}

export async function updateUserPrefs(
	userId: number,
	prefs: {
		defaultBarId?: string | number | null
		decafStartHour?: number
	},
) {
	const updateData: any = {}
	if (prefs.defaultBarId !== undefined) {
		updateData.defaultBarId =
			typeof prefs.defaultBarId === 'string'
				? parseInt(prefs.defaultBarId)
				: prefs.defaultBarId
	}
	if (prefs.decafStartHour !== undefined) {
		updateData.decafStartHour = prefs.decafStartHour
	}

	return prisma.user.update({
		where: { id: userId },
		data: updateData,
	})
}
