import { prisma } from '@/lib/prisma'
import { UserPreferencesFormData } from '@/lib/validators'
import bcrypt from 'bcryptjs'

export async function getUserById(id: number) {
	return prisma.user.findUnique({
		where: { id },
	})
}

export async function updateUserPrefs(
	id: number,
	input: Partial<UserPreferencesFormData>,
) {
	const { defaultBarId, ...rest } = input
	const data: any = { ...rest }

	if (defaultBarId !== undefined) {
		data.defaultBarId =
			defaultBarId === 'personal' ? null : Number(defaultBarId)
	}

	return prisma.user.update({
		where: { id },
		data,
	})
}

export async function checkUsernameAvailability(username: string) {
	const user = await prisma.user.findUnique({
		where: { username },
	})
	return !user
}

interface UpdateAccountInput {
	username?: string
	newPassword?: string
	currentPassword?: string
}

export async function updateUserAccount(id: number, data: UpdateAccountInput) {
	const user = await prisma.user.findUnique({ where: { id } })
	if (!user) throw new Error('User not found')

	if (data.currentPassword) {
		const isValid = await bcrypt.compare(data.currentPassword, user.password)
		if (!isValid) throw new Error('Invalid current password')
	} else if (
		data.newPassword ||
		(data.username && data.username !== user.username)
	) {
		throw new Error('Current password is required')
	}

	const updateData: any = {}
	if (data.username && data.username !== user.username) {
		const existing = await prisma.user.findUnique({
			where: { username: data.username },
		})
		if (existing) throw new Error('Username already taken')
		updateData.username = data.username
	}

	if (data.newPassword) {
		updateData.password = await bcrypt.hash(data.newPassword, 10)
	}

	if (Object.keys(updateData).length === 0) return user

	return prisma.user.update({
		where: { id },
		data: updateData,
	})
}
