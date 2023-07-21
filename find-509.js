// TODO(flyc): message

import fs from 'fs'
import path from 'path'
import {
  UNCOMPLETED_URL_LIST_LOG_PREFIX,
  createFolders,
  LOG_DIRECTORY,
  readAllSavedImages,
  readAllRawImages,
} from './utils.js'

start()

function start() {
  console.log("Let's handle 509")
  createFolders()

  const PATH_509 = './509'
  const { size: size509 } = fs.statSync(PATH_509)
  const base64of509 = fs.readFileSync(PATH_509, { encoding: 'base64' })

  const brokenFileList = readAllRawImages({ readDetail: true }).filter((info) => {
    const { size } = info.detail
    return size509 === size && info.detail.getBase64() === base64of509
  })
  const brokenFileMap = Object.fromEntries(brokenFileList.map((info) => [info.hash, true]))

  if (brokenFileList.length === 0) {
    console.log('There are no 509 files! Congratulation!')
    return
  }
  console.log(`There are ${brokenFileList.length} files are 509!`)

  const saveFileList = readAllSavedImages().flatImages.filter((info) => Boolean(brokenFileMap[info.hash]))
  const uncompletedUrlList = [...new Set(saveFileList.map((info) => info.url))]

  fs.writeFileSync(
    path.resolve(path.join(LOG_DIRECTORY, `${UNCOMPLETED_URL_LIST_LOG_PREFIX}-${Date.now()}.json`)),
    JSON.stringify(uncompletedUrlList, null, 2)
  )

  const deletePathList = [...brokenFileList, ...saveFileList].map((info) => info.fullPath)

  console.log(`There are ${brokenFileList.length} raw images 509`)
  console.log(`There are ${saveFileList.length} saved images 509`)
  console.log('Going to remove them...')

  deletePathList.forEach((path) => fs.unlinkSync(path))

  console.log('Done!')
}
