import { z } from 'zod'
import { MongooseBaseSchema } from '../mongoose'

export const userIdSchema = z.coerce.string().brand<'userId'>()
export const usernameSchema = z.string().startsWith('@').brand<'username'>()

export const userSchema = MongooseBaseSchema.extend({
  id: userIdSchema,
  name: z.string(),
  tg: usernameSchema,
})

export const userChatMember = z.enum(['creator', 'administrator', 'member', 'left'])

export type User = z.infer<typeof userSchema>
export type UserId = z.infer<typeof userIdSchema>
export type Username = z.infer<typeof usernameSchema>
export type UserChatMember = z.infer<typeof userChatMember>
