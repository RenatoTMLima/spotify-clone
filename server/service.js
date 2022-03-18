import fs from 'fs'
import fsPromises from 'fs/promises'
import config from './config.js'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { PassThrough } from 'stream'
import throttle from 'throttle'
import childProcess from 'child_process'

const {
  dir: {
    publicDir
  }
} = config

export class Service {
  constructor() {
    this.clientStreams = new Map()
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