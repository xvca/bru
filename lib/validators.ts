import { z } from 'zod'

export const BREW_METHODS = [
	'Espresso',
	'Pour Over',
	'French Press',
	'AeroPress',
	'Cold Brew',
	'Moka Pot',
	'Drip',
	'Siphon',
	'Turkish Coffee',
	'Other',
] as const

// Auth
export const authSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type AuthFormData = z.infer<typeof authSchema>

// Beans
export const beanSchema = z
	.object({
		name: z.string().min(1, 'Name is required'),
		roaster: z.string().optional().nullable(),
		origin: z.string().optional().nullable(),
		roastLevel: z.string().optional().nullable(),
		process: z.string().optional().nullable(),
		producer: z.string().optional().nullable(),
		roastDate: z.string().min(1, 'Roast date is required'),
		freezeDate: z.string().optional().nullable(),
		initialWeight: z.coerce.number().positive('Weight must be positive'),
		remainingWeight: z.coerce.number().min(0).optional().nullable(),
		notes: z.string().optional().nullable(),
		barId: z.coerce.number().optional().nullable(),
	})
	.refine(
		(data) => {
			if (!data.freezeDate || !data.roastDate) return true
			const roast = new Date(data.roastDate)
			const freeze = new Date(data.freezeDate)
			return freeze >= roast
		},
		{
			message: 'Freeze date cannot be before roast date',
			path: ['freezeDate'],
		},
	)

export type BeanFormData = z.infer<typeof beanSchema>

// Brews
export const brewSchema = z.object({
	beanId: z.coerce.number().min(1, 'Bean is required'),
	method: z.string().min(1, 'Method is required'),
	doseWeight: z.coerce.number().min(0.1, 'Dose weight must be positive'),
	yieldWeight: z.coerce.number().min(0.1).optional().nullable(),
	brewTime: z.coerce.number().min(0).optional().nullable(),
	grindSize: z.coerce.number().min(0).optional().nullable(),
	waterTemperature: z.coerce.number().min(1).max(100).optional().nullable(),
	rating: z.coerce.number().min(0).max(5).optional().nullable(),
	tastingNotes: z.string().optional().nullable(),
	barId: z.coerce.number().optional().nullable(),
	brewerId: z.coerce.number().optional().nullable(),
	grinderId: z.coerce.number().optional().nullable(),
})

export type BrewFormData = z.infer<typeof brewSchema>

// Brewers
export const brewerSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.enum(BREW_METHODS).or(z.string()),
	notes: z.string().optional().nullable(),
	barId: z.coerce.number().optional().nullable(),
})

export type BrewerFormData = z.infer<typeof brewerSchema>

// Grinders
export const grinderSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	burrType: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	barId: z.coerce.number().optional().nullable(),
})

export type GrinderFormData = z.infer<typeof grinderSchema>

// Brew Bars
export const brewBarSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	location: z.string().optional().nullable(),
})

export type BrewBarFormData = z.infer<typeof brewBarSchema>

// Members
export const inviteSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	role: z.string().optional(),
})

export type InviteFormData = z.infer<typeof inviteSchema>

// User Preferences
export const userPreferencesSchema = z.object({
	defaultBarId: z.string().optional(),
	decafStartHour: z.number().min(0).max(23).optional(),
})

export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>

// ESP preferences
export const espPrefsSchema = z.object({
	isEnabled: z.boolean(),
	regularPreset: z.coerce.number().min(0).max(100),
	decafPreset: z.coerce.number().min(0).max(100),
	pMode: z.coerce.number(),
	decafStartHour: z.coerce
		.number()
		.refine((val) => val === -1 || (val >= 0 && val <= 23), {
			message: 'Use “Disabled” or choose an hour between 0 and 23.',
		}),
	timezone: z.string(),
	learningRate: z.coerce.number().min(0).max(1.0),
	systemLag: z.coerce.number().min(0).max(2.0),
})

export type ESPPrefsFormData = z.infer<typeof espPrefsSchema>
