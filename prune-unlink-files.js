import { readAllRawImages, readAllSavedImages } from './utils.js'
import fs from 'fs'

start()
function start() {
  console.log("Let's prune extra raw files!")

  const rawImages = readAllRawImages()

  const saveImages = readAllSavedImages().flatImages
  const saveImagesMap = Object.fromEntries(saveImages.map((info) => [info.hash, true]))

  const deleteList = rawImages.filter((rawInfo) => !saveImagesMap[rawInfo.hash]).map((item) => item.fullPath)

  console.log(`There are ${rawImages.length} raw Images!`)
  console.log(`There are ${saveImages.length} save Images!`)

  if (deleteList.length === 0) {
    console.log('All raw images at least linked to one save images!')
    return
  }

  console.log(`${deleteList.length} images in raw images are not linked to any save images.`)

  console.log('Pruning...')

  deleteList.forEach((path) => fs.unlinkSync(path))

  console.log('Done!')
}
