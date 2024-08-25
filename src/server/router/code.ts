import { initTRPC } from '@trpc/server'
import { z } from 'zod'

import { Assertion } from '@/common/assertion'
import { codeSchema } from '@/common/code'
import { UserId, userIdSchema } from '@/common/user'

import { codeService } from '../services'

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
		.input(z.object({ userId: userIdSchema.optional(), code: z.string().optional() }))
		.output(codeSchema.nullable())
		.query(async ({ input }) => {
			let userId = input.userId ? input.userId : null

			if (input.code) {
				const result = await codeService.readByCode(input.code)

				if (result.success && result.data) {
					userId = result.data.userId
				} else {
					return null
				}
			}

			const result = await codeService.update(userId as UserId, { isUsed: true })

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
