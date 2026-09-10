export class ApiError extends Error {
	status: number
	constructor(status: number, message: string) {
		super(message)
		this.status = status
	}
}

const MAX_DATABASE_ID = 2_147_483_647

export function parseId(value: unknown, label = 'ID'): number {
	if (
		(typeof value !== 'number' && typeof value !== 'string') ||
		(typeof value === 'string' && !/^[1-9]\d*$/.test(value))
	)
		throw new ApiError(400, `Invalid ${label}`)
	const id = Number(value)
	if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID)
		throw new ApiError(400, `Invalid ${label}`)
	return id
}

export function parseOptionalId(value: unknown, label: string) {
	return value === undefined ? undefined : parseId(value, label)
}

export function parseOptionalString(value: unknown, label: string) {
	if (value === undefined) return undefined
	if (typeof value !== 'string') throw new ApiError(400, `Invalid ${label}`)
	return value
}
