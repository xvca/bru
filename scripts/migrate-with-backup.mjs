import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	resolve,
} from 'node:path'
import Database from 'better-sqlite3'

function databasePath(databaseUrl) {
	if (!databaseUrl?.startsWith('file:')) {
		throw new Error('DATABASE_URL must be a SQLite file URL')
	}

	const value = decodeURIComponent(
		databaseUrl.slice('file:'.length).split('?')[0],
	)
	return isAbsolute(value) ? value : resolve(value)
}

function migrationNames() {
	const directory = resolve('prisma/migrations')
	return readdirSync(directory, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isDirectory() &&
				existsSync(join(directory, entry.name, 'migration.sql')),
		)
		.map((entry) => entry.name)
}

function pendingMigrations(database) {
	const hasMigrationTable = database
		.prepare(
			"SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'",
		)
		.get()
	if (!hasMigrationTable) return migrationNames()

	const applied = new Set(
		database
			.prepare(
				'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
			)
			.all()
			.map((row) => row.migration_name),
	)
	return migrationNames().filter((name) => !applied.has(name))
}

function backupName(path) {
	const extension = extname(path) || '.db'
	const name = basename(path, extname(path))
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
	return `${name}-pre-migration-${timestamp}${extension}`
}

async function backupIfNeeded(path) {
	if (!existsSync(path) || statSync(path).size === 0) {
		console.log('No existing database to back up.')
		return
	}

	const database = new Database(path, { readonly: true, fileMustExist: true })
	try {
		const pending = pendingMigrations(database)
		if (pending.length === 0) {
			console.log('No pending migrations; backup not needed.')
			return
		}

		const backupDirectory = resolve(
			process.env.DATABASE_BACKUP_DIR || join(dirname(path), 'backups'),
		)
		mkdirSync(backupDirectory, { recursive: true })
		const destination = join(backupDirectory, backupName(path))
		await database.backup(destination)
		console.log(`Database backed up to ${destination}`)
	} finally {
		database.close()
	}
}

async function main() {
	const path = databasePath(process.env.DATABASE_URL)
	await backupIfNeeded(path)

	const executable = resolve(
		'node_modules/.bin',
		process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
	)
	const result = spawnSync(executable, ['migrate', 'deploy'], {
		stdio: 'inherit',
		env: process.env,
	})
	if (result.error) throw result.error
	if (result.status !== 0) process.exit(result.status ?? 1)
}

main().catch((error) => {
	console.error('Migration backup failed:', error)
	process.exit(1)
})
