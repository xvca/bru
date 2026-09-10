const isLite = process.env.NEXT_PUBLIC_LITE === 'true'

/** @type {import('next').NextConfig} */

const nextConfig = {
	reactStrictMode: true,
	...(isLite && {
		turbopack: {
			resolveAlias: {
				'@/lib/prisma': './lib/prisma-stub.ts',
				'@/generated/prisma/client': './lib/prisma-stub.ts',
			},
		},
		async redirects() {
			return [
				{ source: '/beans', destination: '/', permanent: true },
				{ source: '/brews', destination: '/', permanent: true },
				{ source: '/equipment', destination: '/', permanent: true },
			]
		},
	}),
}

module.exports = nextConfig
