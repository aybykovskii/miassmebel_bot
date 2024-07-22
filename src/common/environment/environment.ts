import 'dotenv/config'
import { z } from 'zod'

import { Log } from '@/common/logger'
import { usernameSchema } from '@/common/user'

export const usernames = z
	.string()
	.optional()
	.transform((str) => str?.split(',').map((s) => usernameSchema.parse(s)) ?? [])

const boolean = z.enum(['true', 'false']).transform((str) => str === 'true')

export const environmentSchema = z.object({
	MODE: z.enum(['development', 'production']),
	TG_BOT_TOKEN: z.string(),
	MONGODB_URL: z.string(),
	SERVER_PORT: z.string().transform(Number),
	CHAT_ID: z.string(),
	CATALOGUE_URL: z.string(),
	WEBSITE1_URL: z.string(),
	WEBSITE2_URL: z.string(),
	ADD_WEBSITES_BUTTONS: boolean,
	ADD_CATALOGUE_BUTTON: boolean,
	ADD_CODE_BUTTON: boolean,
	DELETE_ALL_BUTTONS: boolean,
	CHANGE_POST_BUTTONS_USERS: usernames,
	GET_LIST_USERS: usernames,
	MARK_AS_USED_USERS: usernames,
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
