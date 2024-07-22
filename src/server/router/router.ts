import { initTRPC } from '@trpc/server'

import { codeRouter } from './code'
import { userRouter } from './user'

const t = initTRPC.create()

export const rootRouter = t.router({
	user: userRouter,
	code: codeRouter,
})

export type RootRouter = typeof rootRouter
