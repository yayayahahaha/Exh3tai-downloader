import { RAW_IMAGES_DIRETORY, SAVE_DIRECTORY } from './utils.js'
import fs from 'fs'
import path from 'path'

const rawImages = fs.readdirSync(RAW_IMAGES_DIRETORY).map((file) => path.resolve(path.join(RAW_IMAGES_DIRETORY, file)))
const saveImages = fs
  .readdirSync(SAVE_DIRECTORY)
  .map((folder) => {
    const saveFolderPath = path.resolve(path.join(SAVE_DIRECTORY, folder))
    if (!fs.lstatSync(saveFolderPath).isDirectory()) return null

    return fs.readdirSync(saveFolderPath).map((fileName) => path.join(saveFolderPath, fileName))
  })
  .filter(Boolean)
  .flat()
  .map((filePath) => {
    const { name } = path.parse(filePath)
    return name.split('-')[1]
  })

const saveImagesMap = Object.fromEntries(saveImages.map((item) => [item, true]))
const deleteList = rawImages.filter((filePath) => {
  const { name } = path.parse(filePath)
  const hash = name.split('-')[0]
  return !saveImagesMap[hash]
})

console.log(deleteList)
