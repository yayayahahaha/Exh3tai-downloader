import { REAL_IMAGES_DIRECTORY, createFolders, readAllRawImages, readAllSavedImages, readSettingJson } from './utils.js'
import fs from 'fs'
import path from 'path'

// TODO(flyc): 各種邊際除錯: error handling, folder-name not-found, update strategy

start()

function start() {
  createFolders()

  const setting = readSettingJson()
  if (setting == null) return

  const { makeItReal: folderNames } = setting
  if (!Array.isArray(folderNames)) return // TODO(flyc): warning message

  const savedImages = readAllSavedImages()
  const rawImages = readAllRawImages()
  const rawImageMap = Object.fromEntries(rawImages.map((image) => [image.hash, image]))

  const folderNameMap = Object.fromEntries(folderNames.map((name) => [name, true]))

  console.log('想要變成實體圖片的資料夾: ')
  folderNames.forEach((folder, index) => console.log(`${index + 1}. ${folder}`))

  savedImages.flatImages
    .filter((image) => folderNameMap[image.folder])
    .forEach((image) => {
      const { fullName: fileName, folder } = image
      const rawPath = rawImageMap[image.hash].fullPath

      const fullFolder = path.resolve(path.join(REAL_IMAGES_DIRECTORY, folder))
      if (!fs.existsSync(fullFolder)) fs.mkdirSync(fullFolder)

      const fullFileName = path.resolve(fullFolder, fileName)
      fs.copyFileSync(rawPath, fullFileName)
    })

  console.log('創建成功')
}
