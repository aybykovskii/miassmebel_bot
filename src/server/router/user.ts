import { initTRPC } from '@trpc/server'
import { z } from 'zod'

import { userIdSchema, userSchema } from '@/common/user'
import { Assertion } from '@/common/assertion'

import { userService } from '../services'

const t = initTRPC.create()
const { procedure } = t

export const userRouter = t.router({
  create: procedure
    .input(userSchema.omit({ _id: true }))
    .output(userSchema)
    .query(async ({ input }) => {
      const findResult = await userService.read(input.id)

      if (findResult.success && findResult.data) {
        return findResult.data
      }

      const result = await userService.create(input)

      Assertion.server(result)

      return result.data
    }),

  getAll: procedure
    .input(z.void())
    .output(z.array(userSchema))
    .query(async () => {
      const result = await userService.readAll()

      Assertion.server(result)

      return result.data
    }),

  getById: procedure
    .input(userIdSchema)
    .output(userSchema.nullable())
    .query(async ({ input }) => {
      const result = await userService.read(input)

      Assertion.server(result)

      return result.data
    }),

  getByUsername: procedure
    .input(z.string())
    .output(userSchema.nullable())
    .query(async ({ input }) => {
      const result = await userService.readByUsername(input)

      Assertion.server(result)

      return result.data
    }),

  update: procedure
    .input(userSchema.pick({ id: true }).and(userSchema.partial()))
    .output(userSchema.nullable())
    .query(async ({ input }) => {
      const result = await userService.update(input.id, input)

      Assertion.server(result)

      return result.data
    }),

  delete: procedure
    .input(userIdSchema)
    .output(z.null())
    .query(async ({ input }) => {
      const result = await userService.delete(input)

      Assertion.server(result)

      return result.data
    }),
})
