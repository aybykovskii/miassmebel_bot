import { BotCommand } from 'node-telegram-bot-api'
import { z } from 'zod'

import { t } from '../i18n'

export const Commands = z.enum([
  'start',
  'id',
  'info',
  'codes_list',
  'mark_code_as_used',
  'react_on_edit_on',
  'react_on_edit_off',
])
export type Command = z.infer<typeof Commands>
export type TelegramCommand = `/${Command}`

export const commands: BotCommand[] = Object.values(Commands.Values).map((cmd) => ({
  command: `/${cmd}`,
  description: t(`commands.${cmd}.description`),
}))
