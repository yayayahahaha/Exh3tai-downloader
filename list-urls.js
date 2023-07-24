import { LOG_DIRECTORY, readAllRawImages } from './utils.js'
import fs from 'fs'
import path from 'path'

start()

function start() {
  console.log('List all Urls..')

  const rawImages = readAllRawImages()
  const urls = [...new Set(rawImages.map((item) => item.url))]
  const logName = path.resolve(path.join(LOG_DIRECTORY, `current-urls-${Date.now()}.json`))
  fs.writeFileSync(logName, JSON.stringify(urls, null, 2))

  console.log(`There are ${rawImages.length} images from ${urls.length} urls!`)
  console.log(`See more detail in ${logName}`)
  console.log('Done!')
}
