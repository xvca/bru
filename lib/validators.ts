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

// Beans
export const beanSchema = z
	.object({
		name: z.string().min(1, 'Name is required'),
		roaster: z.string().optional().nullable(),
		origin: z.string().optional().nullable(),
		roastLevel: z.string().optional().nullable(),
		process: z.string().optional().nullable(),
		producer: z.string().optional().nullable(),
		roastDate: z
			.string()
			.refine(
				(value) => Number.isFinite(Date.parse(value)),
				'Valid roast date is required',
			),
		freezeDate: z
			.string()
			.refine(
				(value) => !value || Number.isFinite(Date.parse(value)),
				'Invalid freeze date',
			)
			.optional()
			.nullable(),
		initialWeight: z.coerce
			.number()
			.finite()
			.positive('Weight must be positive'),
		remainingWeight: z.coerce.number().min(0).optional().nullable(),
		notes: z.string().optional().nullable(),
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
	.refine(
		(data) => {
			if (data.remainingWeight === null || data.remainingWeight === undefined)
				return true
			return data.remainingWeight <= data.initialWeight
		},
		{
			message: "Remaining weight can't exceed initial weight",
			path: ['remainingWeight'],
		},
	)

export type BeanFormData = z.infer<typeof beanSchema>

// Brews
export const brewSchema = z.object({
	beanId: z.coerce.number().int().positive('Bean is required'),
	method: z.string().min(1, 'Method is required'),
	doseWeight: z.coerce
		.number()
		.finite()
		.min(0.1, 'Dose weight must be positive'),
	yieldWeight: z.coerce.number().finite().min(0.1).optional().nullable(),
	brewTime: z.coerce.number().finite().min(0).optional().nullable(),
	grindSize: z.coerce.number().finite().min(0).optional().nullable(),
	waterTemperature: z.coerce.number().min(1).max(100).optional().nullable(),
	rating: z.coerce.number().int().min(0).max(5).optional().nullable(),
	notes: z.string().optional().nullable(),
	brewerId: z.coerce.number().int().positive().optional().nullable(),
	grinderId: z.coerce.number().int().positive().optional().nullable(),
})

export type BrewFormData = z.infer<typeof brewSchema>

// Brewers
export const brewerSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.string().trim().min(1, 'Type is required'),
	notes: z.string().optional().nullable(),
})

export type BrewerFormData = z.infer<typeof brewerSchema>

// Grinders
export const grinderSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	burrType: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

export type GrinderFormData = z.infer<typeof grinderSchema>

export const preferencesSchema = z.object({
	decafStartHour: z.number().int().min(-1).max(23).optional(),
})

export type PreferencesFormData = z.infer<typeof preferencesSchema>

// ESP preferences
export const DEFAULT_MAX_SHOT_WEIGHT = 100
export const MAX_CONFIGURABLE_SHOT_WEIGHT = 1000

export const espPrefsSchema = z
	.object({
		isEnabled: z.boolean(),
		autoSavePreset: z.boolean(),
		regularPreset: z.coerce.number().min(1).max(MAX_CONFIGURABLE_SHOT_WEIGHT),
		decafPreset: z.coerce.number().min(1).max(MAX_CONFIGURABLE_SHOT_WEIGHT),
		maxShotWeight: z.coerce
			.number()
			.min(1)
			.max(MAX_CONFIGURABLE_SHOT_WEIGHT)
			.optional(),
		pMode: z.coerce.number(),
		decafStartHour: z.coerce
			.number()
			.refine((val) => val === -1 || (val >= 0 && val <= 23), {
				message: 'Use “Disabled” or choose an hour between 0 and 23.',
			}),
		timezone: z.string(),
		learningRate: z.coerce.number().min(0).max(1.0),
		systemLag: z.coerce.number().min(0).max(2.0),
		earlyStop: z.boolean(),
		swapButtons: z.boolean(),
		halfForTwoCup: z.boolean(),
	})
	.superRefine((prefs, ctx) => {
		const max = prefs.maxShotWeight ?? DEFAULT_MAX_SHOT_WEIGHT
		for (const field of ['regularPreset', 'decafPreset'] as const) {
			if (prefs[field] > max) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [field],
					message: `Must not exceed maximum shot yield (${max}g).`,
				})
			}
		}
	})

export type ESPPrefsFormData = z.infer<typeof espPrefsSchema>
