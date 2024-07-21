import TelegramBot, { ChatMemberStatus, InlineKeyboardButton, Message } from 'node-telegram-bot-api'
import { createTRPCProxyClient } from '@trpc/client'
import { z } from 'zod'

import { Assertion } from '@/common/assertion'
import { AppError } from '@/common/error'
import { Phrase, t } from '@/common/i18n'
import { RootRouter } from '@/server/router'
import { Extended } from '@/types'
import { UserId, userIdSchema, Username, usernameSchema } from '@/common/user'
import { env, environmentSchema } from '@/common/environment'
import { GenerateCodeCD } from '@/common/callbackData'

type ClientTRPC = ReturnType<typeof createTRPCProxyClient<RootRouter>>

const envFieldsToChange = environmentSchema.pick({
  ADD_WEBSITES_BUTTONS: true,
  ADD_CATALOGUE_BUTTON: true,
  ADD_CODE_BUTTON: true,
  DELETE_ALL_BUTTONS: true,
})

export type EnvFieldsToChange = keyof z.infer<typeof envFieldsToChange>

const commandsList = z.enum([
  'start',
  'info',
  'help',
  'codes_list',
  'mark_code_as_used',
  'add_websites_buttons',
  'add_websites_buttons_off',
  'add_catalogue_button',
  'add_catalogue_button_off',
  'add_code_button',
  'add_code_button_off',
  'delete_all_buttons',
  'delete_all_buttons_off',
])

type CommandInfo = {
  validate: ((username: Username) => boolean) | null
  envField: EnvFieldsToChange | null
  description: string
  command: `/${z.infer<typeof commandsList>}`
}

const envButtonsFields = environmentSchema.pick({
  ADD_WEBSITES_BUTTONS: true,
  ADD_CATALOGUE_BUTTON: true,
  ADD_CODE_BUTTON: true,
  DELETE_ALL_BUTTONS: true,
})

type EnvButtonsFields = keyof z.infer<typeof envButtonsFields>

type ButtonInfo = {
  envField: EnvButtonsFields
  buttons: InlineKeyboardButton[]
}

export class Bot extends TelegramBot {
  trpc: ClientTRPC

  commandList = commandsList

  commands: Record<z.infer<typeof this.commandList>, CommandInfo>

  buttons: ButtonInfo[] = [
    {
      envField: 'ADD_WEBSITES_BUTTONS',
      buttons: [
        {
          text: t('buttons.website1'),
          url: env.WEBSITE1_URL,
        },
        {
          text: t('buttons.website2'),
          url: env.WEBSITE2_URL,
        },
      ],
    },
    {
      envField: 'ADD_CATALOGUE_BUTTON',
      buttons: [
        {
          text: t('buttons.catalogue'),
          url: env.CATALOGUE_URL,
        },
      ],
    },
    {
      envField: 'ADD_CODE_BUTTON',
      buttons: [
        {
          text: t('buttons.get_code'),
          callback_data: GenerateCodeCD.fill({}),
        },
      ],
    },
  ]

  constructor(token: string, trpc: ClientTRPC) {
    super(token, { polling: true })

    this.trpc = trpc

    type CommandText = z.infer<typeof this.commandList>

    const commands = {
      start: {
        validate: null,
        envField: null,
      },
      info: {
        validate: null,
        envField: null,
      },
      help: {
        validate: null,
        envField: null,
      },
      codes_list: {
        validate: this.canGetCodesList,
        envField: null,
      },
      mark_code_as_used: {
        validate: this.canMarkCodeAsUsed,
        envField: null,
      },
      add_websites_buttons: {
        validate: this.canChangePostButtons,
        envField: 'ADD_WEBSITES_BUTTONS',
      },
      add_websites_buttons_off: {
        validate: this.canChangePostButtons,
        envField: 'ADD_WEBSITES_BUTTONS',
      },
      add_catalogue_button: {
        validate: this.canChangePostButtons,
        envField: 'ADD_CATALOGUE_BUTTON',
      },
      add_catalogue_button_off: {
        validate: this.canChangePostButtons,
        envField: 'ADD_CATALOGUE_BUTTON',
      },
      add_code_button: {
        validate: this.canChangePostButtons,
        envField: 'ADD_CODE_BUTTON',
      },
      add_code_button_off: {
        validate: this.canChangePostButtons,
        envField: 'ADD_CODE_BUTTON',
      },
      delete_all_buttons: {
        validate: this.canChangePostButtons,
        envField: 'DELETE_ALL_BUTTONS',
      },
      delete_all_buttons_off: {
        validate: this.canChangePostButtons,
        envField: 'DELETE_ALL_BUTTONS',
      },
    } satisfies Record<CommandText, Pick<CommandInfo, 'validate' | 'envField'>>

    this.commands = Object.entries(commands).reduce(
      (acc, [command, info]) => {
        const commandText = command as CommandText
        acc[commandText] = {
          ...info,
          description: t(`commands.${commandText}.description`),
          command: `/${commandText}`,
        }
        return acc
      },
      {} as Record<CommandText, CommandInfo>
    )
  }

  getMessageInfo = async (msg: Message) => {
    const {
      text,
      from,
      chat: { id: chatId },
    } = msg

    Assertion.client(from, 'Message must have a sender')

    const username = usernameSchema.parse(from.username ?? '')
    const userId = userIdSchema.parse(chatId)

    const commandsToSet = Object.values(this.commands).filter(
      ({ validate }) => !validate || validate(username)
    )

    this.setMyCommands(commandsToSet, { scope: { chat_id: chatId, type: 'chat' } })

    return {
      ...msg,
      from,
      userId,
      username,
      text: text as Extended<`/${z.infer<typeof this.commandList>}`>,
    }
  }

  send = async (
    msg: Message,
    phrase: Phrase,
    phraseReplaces?: Record<PropertyKey, string | number> | undefined,
    inlineKeyboard?: InlineKeyboardButton[][]
  ) => {
    const { userId } = await this.getMessageInfo(msg)

    try {
      return await this.sendMessage(
        userId,
        t(phrase, phraseReplaces ?? {}),
        !inlineKeyboard
          ? undefined
          : {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            }
      )
    } catch (error) {
      await this.sendMessage(userId, t('error'))

      throw new AppError('client', `${error}`)
    }
  }

  getUserFormatData = (
    id: UserId,
    firstName: string | undefined,
    lastName: string | undefined,
    username: string | undefined
  ) => ({
    id,
    name: [firstName, lastName].filter(Boolean).join(' '),
    tg: usernameSchema.parse(username ?? ''),
  })

  checkUserExistOrCreate = async (
    id: UserId,
    firstName: string | undefined,
    lastName: string | undefined,
    username: string | undefined
  ) => this.trpc.user.create.query(this.getUserFormatData(id, firstName, lastName, username))

  checkShouldUpdateUser = async (id: UserId) => {
    const user = await this.trpc.user.getById.query(id)

    if (!user) return false

    return !user.name || !user.tg
  }

  checkChatMembership = async (
    chatId: string,
    { userId, username }: { userId?: UserId; username?: Username }
  ) => {
    const id = username
      ? await this.trpc.user.getByUsername.query(username).then((data) => data?.id)
      : userId

    if (!id) {
      throw new AppError('client', 'User not found')
    }

    const { status } = await this.getChatMember(chatId, id)

    const adminRoles: ChatMemberStatus[] = ['creator', 'administrator']

    return { isMember: status !== 'left', isAdmin: adminRoles.includes(status) }
  }

  canMarkCodeAsUsed = (username: Username) => env.MARK_AS_USED_USERS.includes(username)

  canChangePostButtons = (username: Username) => env.CHANGE_POST_BUTTONS_USERS.includes(username)

  canGetCodesList = (username: Username) => env.GET_LIST_USERS.includes(username)
}
