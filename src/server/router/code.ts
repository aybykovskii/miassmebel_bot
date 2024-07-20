import { initTRPC } from '@trpc/server'
import { z } from 'zod'

import { userIdSchema } from '@/common/user'
import { Assertion } from '@/common/assertion'

import { codeService } from '../services'
import { codeSchema } from '@/common/code'

const t = initTRPC.create()
const { procedure } = t

export const codeRouter = t.router({
  create: procedure
    .input(userIdSchema)
    .output(codeSchema)
    .query(async ({ input }) => {
      const result = await codeService.create(input)

      Assertion.server(result)

      return result.data
    }),

  getAll: procedure
    .input(z.void())
    .output(codeSchema.array())
    .query(async () => {
      const result = await codeService.readAll()

      Assertion.server(result)

      return result.data
    }),

  getByUserId: procedure
    .input(userIdSchema)
    .output(codeSchema.or(z.null()))
    .query(async ({ input }) => {
      const result = await codeService.read(input)

      Assertion.server(result)

      return result.data
    }),

  markAsUsed: procedure
    .input(userIdSchema)
    .output(codeSchema)
    .query(async ({ input }) => {
      const result = await codeService.update(input, { isUsed: true })

      Assertion.server(result)

      return result.data
    }),

  deleteByUserId: procedure
    .input(userIdSchema)
    .output(z.null())
    .query(async ({ input }) => {
      const result = await codeService.delete(input)

      Assertion.server(result)

      return result.data
    }),
})
