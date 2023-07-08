import fs from 'fs'
import path from 'path'
import { SAVE_DIRECTORY, RAW_IMAGES_DIRETORY } from './utils.js'

const PATH_509 = './509'
const { size: size509 } = fs.statSync(PATH_509)

const borkenFileList = fs.readdirSync(RAW_IMAGES_DIRETORY).filter((fileName) => {
  // 無視正在準備中的
  if (fileName.match(/-preparing$/)) return null
  const rawImagePath = path.resolve(path.join(RAW_IMAGES_DIRETORY, fileName))
  const { size } = fs.statSync(rawImagePath)
  return size509 === size
})
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
  .map((folder) => fs.readdirSync(folder))
  .flat()
  .filter((path) => {
    const hash = path.split('-')[1]
    return Boolean(borkenFileMap[hash])
  })
console.log(saveFileList.length)
