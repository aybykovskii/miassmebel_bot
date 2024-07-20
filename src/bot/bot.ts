import { createTRPCProxyClient } from '@trpc/client'
import TelegramBot, { ChatMemberStatus, InlineKeyboardButton, Message } from 'node-telegram-bot-api'

import { Assertion } from '@/common/assertion'
import { AppError } from '@/common/error'
import { Phrase, t } from '@/common/i18n'
import { RootRouter } from '@/server/router'
import { Extended } from '@/types'
import { UserId } from '@/common/user'
import { userIdSchema } from '../common/user/user'
import { env } from '@/common/environment'

type ClientTRPC = ReturnType<typeof createTRPCProxyClient<RootRouter>>

export class Bot extends TelegramBot {
  trpc: ClientTRPC

  constructor(token: string, trpc: ClientTRPC) {
    super(token, { polling: true })

    this.trpc = trpc
  }

  getMessageInfo = async <T extends string = string>(msg: Message) => {
    const {
      text,
      from,
      chat: { id: chatId },
    } = msg

    Assertion.client(from, 'Message must have a sender')

    return { ...msg, from, userId: userIdSchema.parse(chatId), text: text as Extended<T> }
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

  ensureUserExist = async (userId: UserId, name: string, tg: string) => {
    const result = await this.trpc.user.getById.query(userId)

    if (result) return

    await this.trpc.user.create.query({ id: userId, name, tg })
  }

  checkChatMembership = async (
    chatId: string,
    { userId, username }: { userId?: UserId; username?: string }
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

  canMarkCodeAsUsed = async (userId: UserId) => env.MARK_AS_USED.includes(userId)

  canAddPostButton = async (userId: UserId) => env.ADD_POST_BUTTON.includes(userId)

  canGetCodesList = async (userId: UserId) => env.GET_LIST.includes(userId)
}
