import fs from 'fs'
import { readSettingJson } from './utils.js'

start()
function start() {
  console.log("Let's unique urls in setting.json")

  const jsonData = readSettingJson()
  if (jsonData == null) return

  const { url } = jsonData
  if (!Array.isArray(url)) {
    console.log('Key `url` in setting.json is not an array!')
    return
  }
  const formatted = url.map((rowUrl) => {
    const { origin, pathname } = new URL(rowUrl)
    const url = `${origin}${pathname.replace(/\/$/, '')}`
    return url
  })

  const uniqueUrls = [...new Set(formatted)]
  jsonData.url = uniqueUrls

  fs.writeFileSync('setting.json', JSON.stringify(jsonData, null, 2))
  console.log('Done!')
}
