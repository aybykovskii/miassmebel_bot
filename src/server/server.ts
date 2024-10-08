import { createExpressMiddleware } from '@trpc/server/adapters/express'
import express from 'express'
import mongoose from 'mongoose'

import { env } from '@/common/environment'
import { i18n } from '@/common/i18n'
import { Log, loggerMiddleware } from '@/common/logger'

import { rootRouter } from './router'

export type { RootRouter } from './router'

const app = express()

mongoose
	.connect(env.MONGODB_URL)
	.then(() => {
		Log.info('Connected to mongoDB')
	})
	.catch((e) => {
		Log.error(`Catch error while connecting to mongoDB: ${e}`)
	})

app.use(loggerMiddleware)
app.use(express.json())
app.use(i18n.init)

app.use(
	'/trpc',
	createExpressMiddleware({
		router: rootRouter,
		onError: Log.error,
	})
)

app
	.listen(env.SERVER_PORT, () => {
		Log.info(`Listening on port ${env.SERVER_PORT}`)
	})
	.on('error', (e) => {
		Log.error(`Catch error while listening on port ${env.SERVER_PORT}: ${e}`)
	})
