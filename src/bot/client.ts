import { Message } from 'node-telegram-bot-api'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import { FetchEsque } from '@trpc/client/dist/internals/types'
import { fetch as undiciFetch } from 'undici'

import { env } from '@/common/environment'
import { RootRouter } from '@/server/server'
import { Log } from '@/common/logger'
import { userIdSchema, usernameSchema } from '@/common/user'
import { GenerateCodeCD } from '@/common/callbackData'
import { Assertion } from '@/common/assertion'
import { t } from '@/common/i18n'

import { Bot } from './bot'
import { z } from 'zod'

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
  bot.on('message', async (message) => {
    const { text, userId, username } = await bot.getMessageInfo(message)

    if (text.startsWith('@') && (await bot.canMarkCodeAsUsed(usernameSchema.parse(text)))) {
      const user = await trpc.user.getByUsername.query(text)

      if (!user) return

      const { code } = await trpc.code.markAsUsed.query(user.id)

      await bot.send(message, 'commands.mark_code_as_used.success', { code, username: text })
      return
    }

    switch (text as `/${z.infer<typeof bot.commandList>}`) {
      case '/start': {
        await bot.send(message, 'commands.start.message')
        break
      }

      case '/info': {
        await bot.send(message, 'commands.info.message')
        break
      }

      case '/help': {
        const availableCommands = Object.values(bot.commands).filter(
          ({ validate }) => !validate || validate(username)
        )

        const commandsString = availableCommands
          .map(({ command, description }) => `${command} - ${description}`)
          .join('\n')

        await bot.send(message, 'commands.help.message', { commands: commandsString })
        break
      }

      case '/codes_list': {
        const canGetList = await bot.canGetCodesList(username)
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
        const canMarkCodeAsUsed = await bot.canMarkCodeAsUsed(username)
        if (!canMarkCodeAsUsed) {
          await bot.send(message, 'restricted_error')
          break
        }

        const { code } = await trpc.code.markAsUsed.query(userId)

        await bot.send(message, 'commands.mark_code_as_used.message', { code })
        break
      }

      case '/add_websites_buttons':
      case '/add_websites_buttons_off':
      case '/add_catalogue_button':
      case '/add_catalogue_button_off':
      case '/add_code_button':
      case '/add_code_button_off':
      case '/delete_all_buttons':
      case '/delete_all_buttons_off': {
        const commandText = text.substring(1) as z.infer<typeof bot.commandList>
        const { validate, envField } = bot.commands[commandText]
        const isValidUser = validate?.(username)

        if (!isValidUser || !envField) {
          await bot.send(message, 'restricted_error')
          break
        }

        const isOff = commandText.endsWith('_off')

        env[envField] = !isOff

        await bot.send(message, `commands.${commandText}.message`)

        break
      }

      default: {
        Log.info('Unknown command: ', text)
        await bot.send(message, 'unknown_command')
      }
    }
  })

  const addButtonsHandler = async (message: Message) => {
    const buttons = bot.buttons
    const shouldDeleteAllButtons = env.DELETE_ALL_BUTTONS
    const buttonsToAdd = buttons.filter(({ envField }) => env[envField])

    const shouldReactOnEdit = shouldDeleteAllButtons || buttonsToAdd.length

    if (!shouldReactOnEdit) return

    bot.editMessageReplyMarkup(
      {
        inline_keyboard: shouldDeleteAllButtons ? [] : buttonsToAdd.map(({ buttons }) => buttons),
      },
      {
        chat_id: message.chat.id,
        message_id: message.message_id,
      }
    )
  }

  bot.on('channel_post', addButtonsHandler)
  bot.on('edited_channel_post', addButtonsHandler)
  bot.on('edited_channel_post_text', addButtonsHandler)

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
