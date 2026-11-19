import { REAL_IMAGES_DIRECTORY, exportSavedImagesToDirectory } from './utils.js'
import { lightGreen, yellow } from './console-color.js'

start()

function start() {
  const result = exportSavedImagesToDirectory({
    settingKey: 'makeItReal',
    targetDirectory: REAL_IMAGES_DIRECTORY,
    actionLabel: '想要變成實體圖片',
  })

  if (result == null) {
    process.exitCode = 1
    return
  }

  const { copiedFiles, errors } = result

  if (errors.length > 0) {
    console.log(yellow(`處理完成，但有 ${errors.length} 個錯誤（成功複製 ${copiedFiles.length} 張）`))
    process.exitCode = 1
    return
  }

  if (copiedFiles.length > 0) {
    console.log(lightGreen('創建成功'))
  }
}
