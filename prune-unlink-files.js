import { LOG_DIRECTORY, PRUNE_UNLINK_FILES_LOG_PREFIX, readAllRawImages, readAllSavedImages } from './utils.js'
import fs from 'fs'
import path from 'path'

start()
function start() {
  console.log("Let's prune extra raw files!")

  const rawImages = readAllRawImages()

  const saveImages = readAllSavedImages().flatImages
  const saveImagesMap = Object.fromEntries(saveImages.map((info) => [info.hash, true]))

  const deleteList = rawImages.filter((rawInfo) => !saveImagesMap[rawInfo.hash])

  console.log(`There are ${rawImages.length} raw Images!`)
  console.log(`There are ${saveImages.length} save Images!`)

  if (deleteList.length === 0) {
    console.log('All raw images at least linked to one save images!')
    return
  }

  const logName = `${PRUNE_UNLINK_FILES_LOG_PREFIX}-${Date.now()}.json`
  fs.writeFileSync(
    path.resolve(path.join(LOG_DIRECTORY, logName)),
    JSON.stringify(
      deleteList.map((info) => info.url),
      null,
      2
    )
  )

  console.log(`${deleteList.length} images in raw images are not linked to any save images.`)

  console.log('Pruning...')

  deleteList.forEach((info) => fs.unlinkSync(info.fullPath))

  console.log('Done!')
}
