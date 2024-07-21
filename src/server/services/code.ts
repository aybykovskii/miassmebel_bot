import { Schema, model } from 'mongoose'

import { PromiseResponse } from '@/types'
import { Code, generateCode } from '@/common/code'
import { UserId } from '@/common/user'

const CodeModel = model<Code>(
  'Code',
  new Schema<Code>(
    {
      userId: String,
      code: String,
      isUsed: Boolean,
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

class CodeService {
  create = async (userId: UserId): PromiseResponse<Code> => {
    const result = await CodeModel.create({ userId, code: generateCode(), isUsed: false })

    if (result.errors) {
      return { success: false, error: result.errors.message }
    }

    return { success: true, data: result.toObject() }
  }

  readAll = async (): PromiseResponse<Code[]> => {
    const result = await CodeModel.find()

    return { success: true, data: result.map((code) => code.toObject()) }
  }

  read = async (userId: UserId): PromiseResponse<Code | null> => {
    const result = await CodeModel.findOne({ userId })

    if (!result) {
      return { success: true, data: null }
    }

    return { success: true, data: result.toObject() }
  }

  readByCode = async (code: string): PromiseResponse<Code | null> => {
    const result = await CodeModel.findOne({ code })

    if (!result) {
      return { success: true, data: null }
    }

    return { success: true, data: result.toObject() }
  }

  update = async (userId: UserId, code: Partial<Code>): PromiseResponse<Code> => {
    const result = await CodeModel.findOneAndUpdate({ userId }, code)

    if (!result || result?.errors) {
      return { success: false, error: result?.errors?.message ?? 'Code not found' }
    }

    return { success: true, data: result.toObject() }
  }

  delete = async (userId: UserId): PromiseResponse<null> => {
    const result = await CodeModel.findOneAndDelete({ userId })

    if (!result.ok) {
      return { success: false, error: 'Code not found' }
    }

    return { success: true, data: null }
  }
}

export const codeService = new CodeService()
