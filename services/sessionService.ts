import { prisma } from '@/lib/prisma'
import {
	SESSION_TOUCH_INTERVAL_MS,
	hashSessionToken,
	newSessionToken,
	sessionLifetimeMs,
	validSessionToken,
} from '@/lib/session'

const userSelect = { id: true, username: true } as const

export async function createSession(
	userId: number,
	verifiedPasswordHash: string,
) {
	const expiresAt = new Date(Date.now() + sessionLifetimeMs())
	const token = newSessionToken()
	await prisma.authSession.deleteMany({
		where: { expiresAt: { lte: new Date() } },
	})
	const session = await prisma.$transaction(async (tx) => {
		// A password change during bcrypt verification must not create a new
		// session after the password-change transaction has revoked sessions.
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { password: true },
		})
		if (!user || user.password !== verifiedPasswordHash) return null
		return tx.authSession.create({
			data: { userId, tokenHash: hashSessionToken(token), expiresAt },
			include: { user: { select: userSelect } },
		})
	})
	return session
		? { token, expiresAt: session.expiresAt, user: session.user }
		: null
}

export async function authenticateSession(rawToken: unknown) {
	if (!validSessionToken(rawToken)) return null
	const session = await prisma.authSession.findUnique({
		where: { tokenHash: hashSessionToken(rawToken) },
		include: { user: { select: userSelect } },
	})
	const now = new Date()
	if (!session || session.expiresAt <= now) return null
	const expiresAt = new Date(now.getTime() + sessionLifetimeMs())
	// Renew on activity, with at most one DB write per hour per session.
	const renew =
		expiresAt.getTime() - session.expiresAt.getTime() >=
		SESSION_TOUCH_INTERVAL_MS
	if (renew) {
		const result = await prisma.authSession.updateMany({
			where: {
				id: session.id,
				expiresAt: { gt: now, equals: session.expiresAt },
			},
			data: { expiresAt },
		})
		if (!result.count) {
			const current = await prisma.authSession.findUnique({
				where: { id: session.id },
			})
			if (!current || current.expiresAt <= now) return null
			return { user: session.user, expiresAt: current.expiresAt, renew: true }
		}
	}
	return {
		user: session.user,
		expiresAt: renew ? expiresAt : session.expiresAt,
		renew,
	}
}

export async function revokeSession(rawToken: unknown) {
	if (!validSessionToken(rawToken)) return
	await prisma.authSession.deleteMany({
		where: { tokenHash: hashSessionToken(rawToken) },
	})
}
