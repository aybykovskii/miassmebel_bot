import { initTRPC } from '@trpc/server'

import { userRouter } from './user'
import { codeRouter } from './code'

const t = initTRPC.create()

export const rootRouter = t.router({
  user: userRouter,
  code: codeRouter,
})

export type RootRouter = typeof rootRouter
