import { BotCommand } from 'node-telegram-bot-api'
import { z } from 'zod'

import { t } from '../i18n'

export const Commands = z.enum([
  'start',
  'id',
  'info',
  'codes_list',
  'mark_code_as_used',
  'add_catalogue_button_on_edit_on',
  'add_catalogue_button_on_edit_off',
  'add_code_button_on_edit_on',
  'add_code_button_on_edit_off',
  'delete_all_buttons_on_edit_on',
  'delete_all_buttons_on_edit_off',
])
export type Command = z.infer<typeof Commands>
export type TelegramCommand = `/${Command}`

export const commands: BotCommand[] = Object.values(Commands.Values).map((cmd) => ({
  command: `/${cmd}`,
  description: t(`commands.${cmd}.description`),
}))
