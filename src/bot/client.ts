import { fetch as undiciFetch } from 'undici'
import { FetchEsque } from '@trpc/client/dist/internals/types'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

import { env } from '@/common/environment'
import { RootRouter } from '@/server/server'
import { Log } from '@/common/logger'
import { commands, TelegramCommand } from '@/common/commands'

import { Bot } from './bot'
import { userIdSchema } from '../common/user/user'
import { GenerateCodeCD } from '@/common/callbackData'
import { Assertion } from '@/common/assertion'
import { t } from '@/common/i18n'
import { InlineKeyboardButton } from 'node-telegram-bot-api'

const trpc = createTRPCProxyClient<RootRouter>({
  links: [
    httpBatchLink({
      url: `http://localhost:${env.SERVER_PORT}/trpc`,
      fetch: undiciFetch as FetchEsque,
    }),
  ],
})

const bot = new Bot(env.TG_BOT_TOKEN, trpc)

bot.setChatMenuButton({ menu_button: { type: 'commands' } })

const startBot = async () => {
  bot.setMyCommands(commands)

  bot.on('message', async (message) => {
    const { text, userId } = await bot.getMessageInfo<TelegramCommand>(message)

    if (text.startsWith('@') && (await bot.canMarkCodeAsUsed(userId))) {
      const user = await trpc.user.getByUsername.query(text)

      if (!user) return

      const { code } = await trpc.code.markAsUsed.query(user.id)

      await bot.send(message, 'commands.mark_code_as_used.success', { code, username: text })
      return
    }

    switch (text) {
      case '/start': {
        bot.setMyCommands(commands)
        await bot.send(message, 'commands.start.message')
        break
      }

      case '/id': {
        await bot.send(message, 'commands.id.message', { id: userId })
        break
      }

      case '/info': {
        await bot.send(message, 'commands.info.message')
        break
      }

      case '/codes_list': {
        const canGetList = await bot.canGetCodesList(userId)
        if (!canGetList) {
          await bot.send(message, 'restricted_error')
          break
        }

        const codes = await trpc.code.getAll.query()
        const users = await trpc.user.getAll.query()

        const codesList: string[] = []

        for (const { code, userId, isUsed } of codes) {
          const user = users.find((user) => user.id === userId)
          if (!user) continue

          const { isMember } = await bot.checkChatMembership(env.CHAT_ID, { userId })
          const { name, tg } = user

          codesList.push(
            `${name} (${tg}) - ${code}${isUsed ? ' (использован)' : ''}${
              isMember ? '' : ' (не подписан)'
            }`
          )
        }

        await bot.send(message, 'commands.codes_list.message', {
          codes: codesList.length ? codesList.join('\n') : 'Список пуст',
        })
        break
      }

      case '/mark_code_as_used': {
        const canMarkCodeAsUsed = await bot.canMarkCodeAsUsed(userId)
        if (!canMarkCodeAsUsed) {
          await bot.send(message, 'restricted_error')
          break
        }

        const { code } = await trpc.code.markAsUsed.query(userId)

        await bot.send(message, 'commands.mark_code_as_used.message', { code })
        break
      }

      case '/react_on_edit_on': {
        const canAddPostButton = await bot.canAddPostButton(userId)
        if (!canAddPostButton) {
          await bot.send(message, 'restricted_error')
          break
        }

        env.REACT_ON_EDIT = true

        await bot.send(message, 'commands.react_on_edit_on.message')
        break
      }

      case '/react_on_edit_off': {
        const canAddPostButton = await bot.canAddPostButton(userId)
        if (!canAddPostButton) {
          await bot.send(message, 'restricted_error')
          break
        }

        env.REACT_ON_EDIT = false

        await bot.send(message, 'commands.react_on_edit_off.message')
        break
      }

      default: {
        Log.info('Unknown command: ', text)
        await bot.send(message, 'unknown_command')
      }
    }
  })

  bot.on('edited_channel_post_text', async (message) => {
    if (!env.REACT_ON_EDIT) return

    const messageKeyboard = message.reply_markup?.inline_keyboard
    const codeButton: InlineKeyboardButton = {
      text: 'Получить код на скидку',
      callback_data: GenerateCodeCD.fill({}),
    }

    const keyboard: InlineKeyboardButton[][] = messageKeyboard
      ? [[codeButton], ...messageKeyboard]
      : [[codeButton]]

    bot.editMessageText(message.text || '', {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: { inline_keyboard: keyboard },
    })
  })

  bot.on('callback_query', async (query) => {
    try {
      const {
        data,
        message,
        from: { id, username, first_name: firstName, last_name: lastName },
      } = query
      const userId = userIdSchema.parse(id)

      Assertion.client(data, 'Callback query must have data')
      Assertion.client(message, 'Callback query must have message')

      switch (true) {
        case GenerateCodeCD.match(data): {
          const { isMember } = await bot.checkChatMembership(env.CHAT_ID, { userId })

          if (!isMember) {
            bot.answerCallbackQuery(query.id, {
              text: t('code.membership_error'),
              show_alert: true,
            })

            return
          }

          await bot.ensureUserExist(userId, `${firstName} ${lastName}`, `@${username}`)

          const { code } =
            (await trpc.code.getByUserId.query(userId)) ?? (await trpc.code.create.query(userId))

          bot.answerCallbackQuery(query.id, {
            text: t('code.success', { code }),
            show_alert: true,
          })
        }
      }
    } catch (error) {
      Log.error(error)
    }
  })
}

startBot()
  .then(() => {
    Log.info('Bot is running')
  })
  .catch(Log.error)
