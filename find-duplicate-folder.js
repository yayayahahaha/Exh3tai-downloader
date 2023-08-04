import { DUPLICATE_FOLDER_LOG_PREFIX, LOG_DIRECTORY, SAVE_DIRECTORY, readAllSavedImages } from './utils.js'
import path from 'path'
import fs from 'fs'

start()

function start() {
  const result = readAllSavedImages().flatImages.reduce((map, image) => {
    const { url, folder } = image

    map[url] = map[url] || {}
    map[url][folder] = {}

    return map
  }, {})

  const duplicateUrl = Object.keys(result)
    .filter((url) => Object.keys(result[url]).length !== 1)
    .map((url) => Object.keys(result[url]).map((folder) => path.resolve(path.join(SAVE_DIRECTORY, folder))))

  const logName = `${DUPLICATE_FOLDER_LOG_PREFIX}-${Date.now()}.json`
  fs.writeFileSync(path.resolve(path.join(LOG_DIRECTORY, logName)), JSON.stringify(duplicateUrl, null, 2))

  console.log(`There are ${duplicateUrl.length} url has duplicate folder!`)
  console.log(`See more detail in ${logName}.`)
}
