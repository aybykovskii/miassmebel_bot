import { z } from 'zod'
import { MongooseBaseSchema } from '../mongoose'

export const userIdSchema = z.coerce.string().brand<'userId'>()

export const userSchema = MongooseBaseSchema.extend({
  id: userIdSchema,
  name: z.string(),
  tg: z.string().startsWith('@'),
})

export const userChatMember = z.enum(['creator', 'administrator', 'member', 'left'])

export type User = z.infer<typeof userSchema>
export type UserId = z.infer<typeof userIdSchema>
export type UserChatMember = z.infer<typeof userChatMember>
