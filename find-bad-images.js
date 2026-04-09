import fs from 'fs'
import path from 'path'
import {
  createFolders,
  LOG_DIRECTORY,
  readAllRawImages,
  E_HOST,
} from './utils.js'
import { lightBlue, lightGreen, lightRed, yellow, cyan, magenta, blue } from './console-color.js'

const BAD_IMAGE_FILES = ['./509', './nl-image']

start()

function start() {
  console.log(lightBlue("🔍 開始檢查失效圖片 (509 或 nl-image)..."))
  createFolders()

  // 1. 準備壞圖範本
  const badTemplates = BAD_IMAGE_FILES.filter(p => fs.existsSync(p)).map(p => {
    const { size } = fs.statSync(p)
    const base64 = fs.readFileSync(p, { encoding: 'base64' })
    return { name: path.basename(p), size, base64 }
  })

  if (badTemplates.length === 0) {
    console.log(lightRed("❌ 找不到 509 或 nl-image 範本檔案，請確保檔案存在於根目錄。"))
    return
  }

  console.log(cyan("當前載入的壞圖範本:"), badTemplates.map(t => t.name).join(', '))

  // 2. 讀取所有 raw-images 列表 (先不讀取詳情以節省記憶體與時間)
  console.log(blue("正在讀取資料夾內容..."))
  const allImages = readAllRawImages({ readDetail: false })
  const totalCount = allImages.length
  console.log(cyan("總計發現圖片數量:"), yellow(totalCount), "張")

  // 3. 逐一比對並顯示進度
  const badImagesFound = []
  console.log(blue("開始掃描內容..."))

  allImages.forEach((info, index) => {
    const { fullPath } = info
    
    // 每 1000 張顯示一次進度
    const current = index + 1
    if (current % 1000 === 0 || current === totalCount) {
      const percentage = ((current / totalCount) * 100).toFixed(2)
      console.log(blue(`處理進度: [${current}/${totalCount}] - ${percentage}%`))
    }

    try {
      const { size } = fs.statSync(fullPath)
      
      // 先比對大小，若大小不符就跳過，避免昂貴的 readFileSync
      const matchedTemplate = badTemplates.find(temp => temp.size === size)
      
      if (matchedTemplate) {
        // 大小相符，進一步比對內容
        const fileBase64 = fs.readFileSync(fullPath, { encoding: 'base64' })
        if (fileBase64 === matchedTemplate.base64) {
          badImagesFound.push({
            ...info,
            matchedTemplate: matchedTemplate.name
          })
        }
      }
    } catch (e) {
      console.log(lightRed(`\n讀取檔案失敗: ${fullPath}`), e.message)
    }
  })

  if (badImagesFound.length === 0) {
    console.log(lightGreen("\n✨ 恭喜！掃描完畢，沒有發現任何失效圖片。"))
    return
  }

  console.log(lightRed(`\n🚩 掃描完畢！發現 ${badImagesFound.length} 個失效檔案！`))

  // 4. 整理結果並組出 Gallery URL
  const results = badImagesFound.map(info => {
    const { name, hash, fullName, fullPath, matchedTemplate } = info
    const nameMatchedKeys = name.match(/\w+/g)
    const galleryPath = ['', ...nameMatchedKeys.slice(1)].join('/')
    const galleryUrl = `https://${E_HOST}${galleryPath}`

    return {
      fileName: fullName,
      hash,
      galleryUrl,
      matchedTemplate,
      fullPath
    }
  })

  const urlSet = [...new Set(results.map(r => r.galleryUrl))]
  
  console.log(yellow("\n建議重新下載的作品網址:"))
  urlSet.forEach(url => console.log(magenta(`- ${url}`)))

  // 5. 寫入 Log
  const timestamp = Date.now()
  const logPath = path.resolve(path.join(LOG_DIRECTORY, `bad-images-${timestamp}.json`))
  
  fs.writeFileSync(logPath, JSON.stringify({
    totalCount: totalCount,
    badFilesCount: badImagesFound.length,
    galleriesCount: urlSet.length,
    galleries: urlSet,
    details: results
  }, null, 2))

  console.log(lightGreen(`\n✅ 詳細報告已輸出至: ${logPath}`))
  console.log(cyan("提示: 你可以刪除這些壞檔後重新執行下載器，或直接複製網址。"))
}
