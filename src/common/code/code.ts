import { z } from 'zod'

import { MongooseBaseSchema } from '@/common/mongoose'
import { userSchema } from '@/common/user'

export const codeSchema = MongooseBaseSchema.extend({
	userId: userSchema.shape.id,
	code: z.string(),
	isUsed: z.boolean().optional(),
})

export type Code = z.infer<typeof codeSchema>

export const generateCode = () => Math.floor(1000 + Math.random() * 9000)
