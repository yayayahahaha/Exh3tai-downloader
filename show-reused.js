import { LOG_DIRECTORY, REUSED_LIST_LOG_PREFIX, createFolders, readAllSavedImages } from './utils.js'
import fs from 'fs'
import path from 'path'

start()
function start() {
  console.log("Let's show reused files!")

  createFolders()

  const hashMap = readAllSavedImages().flatImages.reduce((map, imageInfo) => {
    const { hash, fullPath } = imageInfo

    map[hash] = map[hash] || { count: 0, paths: [] }
    map[hash].count++
    map[hash].paths.push(fullPath)
    return map
  }, {})

  const reusedList = Object.keys(hashMap)
    .filter((key) => hashMap[key].count !== 1)
    .map((key) => hashMap[key])

  fs.writeFileSync(
    path.resolve(path.join(LOG_DIRECTORY, `${REUSED_LIST_LOG_PREFIX}-${Date.now()}.json`)),
    JSON.stringify(reusedList, null, 2)
  )

  console.log(`There are ${reusedList.length} files reused!`)

  console.log('Done! Please take a look at log file for more information.')
}
