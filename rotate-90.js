import { ROTATE_90_DIRECTORY, createFolders, readAllRawImages, readAllSavedImages, readSettingJson } from './utils.js'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

start()

async function start() {
  createFolders()

  const setting = readSettingJson()
  if (setting == null) return

  const { 'rotate-90': folderNames } = setting
  if (!Array.isArray(folderNames)) return

  const savedImages = readAllSavedImages()
  const rawImages = readAllRawImages()
  const rawImageMap = Object.fromEntries(rawImages.map((image) => [image.hash, image]))

  const folderNameMap = Object.fromEntries(folderNames.map((name) => [name, true]))

  console.log('想要變成實體圖片並逆時針轉 90 度的資料夾: ')
  folderNames.forEach((folder, index) => console.log(`${index + 1}. ${folder}`))

  const targetFiles = []

  savedImages.flatImages
    .filter((image) => folderNameMap[image.folder])
    .forEach((image) => {
      const { fullName: fileName, folder } = image
      const rawPath = rawImageMap[image.hash].fullPath

      const fullFolder = path.resolve(path.join(ROTATE_90_DIRECTORY, folder))
      if (!fs.existsSync(fullFolder)) fs.mkdirSync(fullFolder)

      const fullFileName = path.resolve(fullFolder, fileName)
      fs.copyFileSync(rawPath, fullFileName)
      targetFiles.push(fullFileName)
    })

  console.log(`複製完成（共 ${targetFiles.length} 張），開始逆時針旋轉 90 度...`)

  for (let i = 0; i < targetFiles.length; i++) {
    const filePath = targetFiles[i]
    const inputBuffer = fs.readFileSync(filePath)
    const outputBuffer = await sharp(inputBuffer).rotate(-90).toBuffer()
    fs.writeFileSync(filePath, outputBuffer)
    console.log(`[${i + 1}/${targetFiles.length}] 已旋轉: ${path.basename(filePath)}`)
  }

  console.log('創建與旋轉成功')
}
