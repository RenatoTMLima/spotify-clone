import fs from 'fs'
import fsPromises from 'fs/promises'
import streamsPromises from 'stream/promises'
import config from './config.js'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { PassThrough, Writable } from 'stream'
import Throttle from 'throttle'
import childProcess from 'child_process'
import { logger } from './util.js'
import { once } from 'events'

const {
  dir: {
    publicDir
  },
  constants: {
    fallbackBitRate,
    englishConversation,
    bitRateDivisor
  }
} = config

export class Service {
  constructor() {
    this.clientStreams = new Map()
    this.currentSong = englishConversation
    this.currentBitRate = 0
    this.throttleTransform = {}
    this.currentReadable = {}

    this.startStreammig()
  }

  createClientStream() {
    const id = randomUUID()

    const clientStream = new PassThrough()

    this.clientStreams.set(id, clientStream)

    return {
      id,
      clientStream
    }
  }

  removeClientStream(id) {
    this.clientStreams.delete(id)
  }

  _executeSoxCommand(args) {
    return childProcess.spawn('sox', args)
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i',
        '-B',
        song
      ]

      const {
        stderr, // tudo que é erro
        stdout, // tudo que é log
        stdin, // enviar dados como stream
      } = this._executeSoxCommand(args)

      await Promise.all([
        once(stderr, 'readable'),
        once(stdout, 'readable')
      ])

      const [success, error] = [stdout, stderr].map(stream => stream.read())

      if(error) return await Promise.reject(error)

      return success.toString().trim().replace(/k/, '000')
    } catch (error) {
      logger.error(`Deu ruim no bitrate: ${error}`)
      return fallbackBitRate
    }
  }

  broadcast() {
    return new Writable({
      write: (chunk, encoding, callback) => {
        for(const [id, stream] of this.clientStreams) {
          // Se o cliente desconectou, não devemos mais mandar dados para ele
          if(stream.writableEnded) {
            this.clientStreams.delete(id)
            continue
          }
          stream.write(chunk)
        }
        callback()
      }
    })
  }
  
  async startStreammig() {
    logger.info(`Starting with ${this.currentSong}`)

    const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong)) / bitRateDivisor

    const throttleTransform = this.throttleTransform = new Throttle(bitRate)

    const songReadable = this.currentReadable = this.createFileStream(this.currentSong)

    return streamsPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadcast()
    )
  }

  stopStreamming() {
    this.throttleTransform?.end?.()
  }
  
  createFileStream(filename) {
    return fs.createReadStream(filename)
  }

  async getFileInfo(file) {
    const fullFilePath = join(publicDir, file)
    // Valida se existe, senao estoura erro
    await fsPromises.access(fullFilePath)
    
    const fileType = extname(fullFilePath)
    
    return {
      type: fileType,
      name: fullFilePath
    }
  }
  
  async getFileStream(file) {
    const {
      name,
      type
    } = await this.getFileInfo(file)
    
    return {
      stream: this.createFileStream(name),
      type
    }
  }
}