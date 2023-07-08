import fs from 'fs'
import { readSettingJson } from './utils.js'

start()
function start() {
  console.log("Let's unique and shuffle urls in setting.json")

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

  const shuffleUrls = [...new Set(formatted)]
  for (let i = 0; i < shuffleUrls.length; i++) {
    const randomIndex = Math.floor(Math.random() * shuffleUrls.length)
    ;[shuffleUrls[i], shuffleUrls[randomIndex]] = [shuffleUrls[randomIndex], shuffleUrls[i]]
  }

  jsonData.url = shuffleUrls

  fs.writeFileSync('setting.json', JSON.stringify(jsonData, null, 2))
  console.log('Done!')
}
