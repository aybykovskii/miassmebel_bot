import dayjs from 'dayjs'

import { COLOR_BY_LOG_TYPE, LogType } from './constants'

export class Log {
	private static log = (label: LogType, messages: unknown[]) => {
		const timestamp = dayjs().format('DD.MM.YYYY HH:mm:ss')

		const getStamp = (isEnd = false) =>
			`${COLOR_BY_LOG_TYPE[label]}[${label.toUpperCase()}${isEnd ? '_END' : ''}] ${
				isEnd ? '' : timestamp
			}\x1b[0m \n`

		console.log(getStamp(), ...messages, `\n${getStamp(true)}`)
	}

	public static info = (...messages: unknown[]) => Log.log('info', messages)

	public static warn = (...messages: unknown[]) => Log.log('warn', messages)

	public static error = (...messages: unknown[]) => Log.log('error', messages)
}
