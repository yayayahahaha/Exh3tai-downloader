// TODO(flyc): message

import fs from 'fs'
import path from 'path'
import {
  RAW_IMAGES_DIRETORY,
  UNCOMPLETED_URL_LIST_LOG_PREFIX,
  createFolders,
  LOG_DIRECTORY,
  PREPARE_SUFFIX,
  readAllSavedImages,
} from './utils.js'

start()

function start() {
  console.log("Let's handle 509")
  createFolders()

  const PATH_509 = './509'
  const { size: size509 } = fs.statSync(PATH_509)
  const base64of509 = fs.readFileSync(PATH_509, { encoding: 'base64' })

  const brokenFileList = fs.readdirSync(RAW_IMAGES_DIRETORY).filter((fileName) => {
    // 無視正在準備中的
    if (fileName.match(new RegExp(`${PREPARE_SUFFIX}$`))) return false

    // 先過濾出檔案大小不一樣的
    const rawImagePath = path.resolve(path.join(RAW_IMAGES_DIRETORY, fileName))
    const { size } = fs.statSync(rawImagePath)
    if (size509 !== size) return false

    return fs.readFileSync(rawImagePath, { encoding: 'base64' }) === base64of509
  })

  if (brokenFileList.length === 0) {
    console.log('There are no 509 files! Congratulation!')
    return
  }
  console.log(`There are ${brokenFileList.length} files are 509!`)

  const brokenFileMap = Object.fromEntries(
    brokenFileList.map((file) => {
      const hash = file.split('-')[0]
      return [hash, file]
    })
  )

  const saveFileList = readAllSavedImages().flatImages.filter((info) => Boolean(brokenFileMap[info.hash]))

  const uncompletedUrlList = [...new Set(saveFileList.map((info) => info.url))]
  fs.writeFileSync(
    path.resolve(path.join(LOG_DIRECTORY, `${UNCOMPLETED_URL_LIST_LOG_PREFIX}-${Date.now()}.json`)),
    JSON.stringify(uncompletedUrlList, null, 2)
  )

  const deleteList = [
    ...brokenFileList.map((fileName) => {
      return path.resolve(path.join(RAW_IMAGES_DIRETORY, fileName))
    }),
    ...saveFileList.map((info) => info.fullPath),
  ]

  console.log(`There are ${brokenFileList.length} raw images 509`)
  console.log(`There are ${saveFileList.length} saved images 509`)
  console.log('Going to remove them...')

  deleteList.forEach((path) => fs.unlinkSync(path))

  console.log('Done!')
}
