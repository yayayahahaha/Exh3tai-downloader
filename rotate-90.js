import { ROTATE_90_DIRECTORY, exportSavedImagesToDirectory, showError } from './utils.js'
import { lightGreen, yellow } from './console-color.js'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

start()

async function start() {
  const result = exportSavedImagesToDirectory({
    settingKey: 'rotate-90',
    targetDirectory: ROTATE_90_DIRECTORY,
    actionLabel: '想要變成實體圖片並逆時針轉 90 度',
  })

  if (result == null) {
    process.exitCode = 1
    return
  }

  const { copiedFiles, errors } = result

  if (copiedFiles.length === 0) {
    if (errors.length > 0) {
      console.log(yellow(`處理結束，共發生 ${errors.length} 個錯誤，沒有圖片被複製。`))
      process.exitCode = 1
    }
    return
  }

  console.log(`複製完成（共 ${copiedFiles.length} 張），開始逆時針旋轉 90 度...`)

  let rotatedCount = 0
  for (let i = 0; i < copiedFiles.length; i++) {
    const filePath = copiedFiles[i]
    try {
      const inputBuffer = fs.readFileSync(filePath)
      const outputBuffer = await sharp(inputBuffer).rotate(-90).toBuffer()
      fs.writeFileSync(filePath, outputBuffer)
      rotatedCount++
      console.log(`[${i + 1}/${copiedFiles.length}] 已旋轉: ${path.basename(filePath)}`)
    } catch (err) {
      const msg = `旋轉失敗 (${path.basename(filePath)}): ${err.message}`
      showError('rotate-90', msg)
      errors.push({ type: 'rotate-failed', file: filePath, message: msg })
    }
  }

  if (errors.length > 0) {
    console.log(yellow(`處理完成，但有 ${errors.length} 個錯誤（成功複製 ${copiedFiles.length} 張，成功旋轉 ${rotatedCount} 張）`))
    process.exitCode = 1
    return
  }

  console.log(lightGreen('創建與旋轉成功'))
}
