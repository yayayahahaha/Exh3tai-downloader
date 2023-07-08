// TODO(flyc): message

import fs from 'fs'
import path from 'path'
import {
  BASE_URL,
  SAVE_DIRECTORY,
  RAW_IMAGES_DIRETORY,
  UNCOMPLETED_URL_LIST_LOG_PREFIX,
  createFolders,
  LOG_DIRECTORY,
} from './utils.js'

start()

function start() {
  console.log("Let's handle 509")
  createFolders()

  const PATH_509 = './509'
  const { size: size509 } = fs.statSync(PATH_509)
  const base64of509 = fs.readFileSync(PATH_509, { encoding: 'base64' })

  const borkenFileList = fs.readdirSync(RAW_IMAGES_DIRETORY).filter((fileName) => {
    // 無視正在準備中的
    if (fileName.match(/-preparing$/)) return false

    // 先過濾出檔案大小不一樣的
    const rawImagePath = path.resolve(path.join(RAW_IMAGES_DIRETORY, fileName))
    const { size } = fs.statSync(rawImagePath)
    if (size509 !== size) return false

    return fs.readFileSync(rawImagePath, { encoding: 'base64' }) === base64of509
  })
  if (borkenFileList.length === 0) {
    console.log('There are no 509 files! Congratulation!')
    return
  }
  console.log(`There are ${borkenFileList.length} files are 509!`)

  const borkenFileMap = Object.fromEntries(
    borkenFileList.map((file) => {
      const hash = file.split('-')[0]
      return [hash, file]
    })
  )

  const saveFileList = fs
    .readdirSync(SAVE_DIRECTORY)
    .map((folder) => {
      const folderPath = path.resolve(path.join(SAVE_DIRECTORY, folder))
      if (!fs.lstatSync(folderPath).isDirectory()) return null
      return folderPath
    })
    .filter(Boolean)
    .map((folder) => {
      return fs.readdirSync(folder).map((fileName) => path.resolve(path.join(folder, fileName)))
    })
    .flat()
    .filter((filePath) => {
      const { name: fileName } = path.parse(filePath)
      const hash = fileName.split('-')[1]
      return Boolean(borkenFileMap[hash])
    })
    .map((filePath) => {
      const { name: fileName } = path.parse(filePath)
      const [_, hash, prefix, p1, p2] = fileName.split('-')
      return {
        hash,
        path: filePath,
        href: [BASE_URL, prefix, p1, p2].join('/'),
      }
    })

  const uncompletedUrlList = [...new Set(saveFileList.map((file) => file.href))]
  fs.writeFileSync(
    path.resolve(path.join(LOG_DIRECTORY, `${UNCOMPLETED_URL_LIST_LOG_PREFIX}-${Date.now()}.json`)),
    JSON.stringify(uncompletedUrlList, null, 2)
  )

  const deleteList = [
    ...borkenFileList.map((fileName) => {
      return path.resolve(path.join(RAW_IMAGES_DIRETORY, fileName))
    }),
    saveFileList.map((file) => file.path),
  ]
  console.log(deleteList)
}
