import { Schema, model } from 'mongoose'

import { User, UserId } from '@/common/user'
import { PromiseResponse } from '@/types'

const UserModel = model<User>(
	'User',
	new Schema<User>(
		{
			id: Number,
			name: String,
			tg: String,
		},
		{
			toObject: {
				transform: (_doc, ret) => {
					ret._id = _doc._id?.toString()

					return ret
				},
			},
			timestamps: {
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			},
		}
	)
)

class UserService {
	create = async (user: Omit<User, '_id'>): PromiseResponse<User> => {
		const result = await UserModel.create(user)

		if (result.errors) {
			return { success: false, error: result.errors.message }
		}

		return { success: true, data: result.toObject() }
	}

	readAll = async (): PromiseResponse<User[]> => {
		const result = await UserModel.find()

		return { success: true, data: result.map((user) => user.toObject()) }
	}

	read = async (id: UserId): PromiseResponse<User | null> => {
		const result = await UserModel.findOne({ id })

		if (!result) {
			return { success: true, data: null }
		}

		return { success: true, data: result.toObject() }
	}

	readByUsername = async (username: string): PromiseResponse<User | null> => {
		const result = await UserModel.findOne({ tg: username })

		if (!result) {
			return { success: true, data: null }
		}

		return { success: true, data: result.toObject() }
	}

	update = async (id: UserId, user: Partial<User>): PromiseResponse<User | null> => {
		const result = await UserModel.findOneAndUpdate({ id }, user)

		if (!result || result?.errors) {
			return { success: false, error: result?.errors?.message ?? 'User not found' }
		}

		return { success: true, data: result.toObject() }
	}

	delete = async (id: UserId): PromiseResponse<null> => {
		const result = await UserModel.findOneAndDelete({ id })

		if (!result.ok) {
			return { success: false, error: 'User not found' }
		}

		return { success: true, data: null }
	}
}

export const userService = new UserService()
