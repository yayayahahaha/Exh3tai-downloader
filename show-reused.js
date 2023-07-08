import { LOG_DIRECTORY, REUSED_LIST_LOG_PREFIX, SAVE_DIRECTORY } from './utils.js'
import fs from 'fs'
import path from 'path'

start()
function start() {
  console.log("Let's show reused files!")

  const hashMap = fs
    .readdirSync(SAVE_DIRECTORY)
    .map((folder) => {
      const saveFolderPath = path.resolve(path.join(SAVE_DIRECTORY, folder))
      if (!fs.lstatSync(saveFolderPath).isDirectory()) return null

      return fs.readdirSync(saveFolderPath).map((fileName) => path.join(saveFolderPath, fileName))
    })
    .filter(Boolean)
    .flat()
    .reduce((map, filePath) => {
      const { name } = path.parse(filePath)
      const hash = name.split('-')[1]

      map[hash] = map[hash] || { count: 0, paths: [] }
      map[hash].count++
      map[hash].paths.push(filePath)
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
