import { createHash, randomBytes } from 'node:crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

export const SESSION_COOKIE = 'bru_session'
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000

export function sessionLifetimeMs() {
	const days = Number(process.env.SESSION_DAYS ?? 30)
	if (!Number.isInteger(days) || days < 1 || days > 365) {
		throw new Error('SESSION_DAYS must be an integer from 1 to 365')
	}
	return days * 86400_000
}

export function newSessionToken() {
	return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string) {
	return createHash('sha256').update(token).digest('hex')
}

export function validSessionToken(token: unknown): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}

export function isSafeSessionRequest(req: NextApiRequest) {
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '')) return true
	// Custom headers cannot be sent by cross-origin forms. Do not enable CORS
	// for cookie-authenticated API routes.
	if (
		req.headers['x-bru-request'] !== '1' ||
		req.headers['sec-fetch-site'] === 'cross-site'
	)
		return false
	if (!req.headers.origin) return true // Non-browser clients still need the custom header.
	try {
		const expected = process.env.APP_ORIGIN ?? `http://${req.headers.host}`
		return new URL(req.headers.origin).host === new URL(expected).host
	} catch {
		return false
	}
}

export function setSessionCookie(
	req: NextApiRequest,
	res: NextApiResponse,
	token: string,
	expiresAt: Date,
) {
	const secure =
		process.env.APP_ORIGIN?.startsWith('https://') ||
		(req.socket as typeof req.socket & { encrypted?: boolean }).encrypted ||
		String(req.headers['x-forwarded-proto'] ?? '')
			.split(',')[0]
			.trim() === 'https'
	const maxAge = token
		? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
		: 0
	res.setHeader(
		'Set-Cookie',
		`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
	)
}

export function clearSessionCookie(req: NextApiRequest, res: NextApiResponse) {
	setSessionCookie(req, res, '', new Date(0))
}
