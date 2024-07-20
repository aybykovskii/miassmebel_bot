import 'dotenv/config'
import { z } from 'zod'

import { Log } from '@/common/logger'
import { UserId } from '../user'

const userIds = z
  .string()
  .optional()
  .transform((str) => (str?.split(',') ?? []) as UserId[])

export const environmentSchema = z.object({
  MODE: z.enum(['development', 'production']),
  TG_BOT_TOKEN: z.string(),
  MONGODB_URL: z.string(),
  SERVER_PORT: z.string().transform(Number),
  REACT_ON_EDIT: z.enum(['true', 'false']).transform((str) => str === 'true'),
  CHAT_ID: z.string(),
  ADD_POST_BUTTON: userIds,
  GET_LIST: userIds,
  MARK_AS_USED: userIds,
})

export type EnvironmentSchema = z.infer<typeof environmentSchema>

class Environment {
  public keys: EnvironmentSchema

  constructor() {
    const env = environmentSchema.parse(process.env)

    Log.info('Starting with environment:', env)
    this.keys = env
  }
}

export const env = new Environment().keys
