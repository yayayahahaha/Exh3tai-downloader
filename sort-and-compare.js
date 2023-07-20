// WIP

import { readAllRawImages, readAllSavedImages } from './utils.js'

start()

function start() {
  const savedImages = readAllSavedImages()
  console.log('savedImages:', savedImages)

  return

  const rawImages = readAllRawImages()
  console.log('rawImages:', rawImages)
}

/*

fs.lstatSync // 如果是 symbol link 的話，不會去找 target, 會回傳 symbol link 的 info
fs.statSync // 會去找 target 的 info
path.seq // string, / or \
path.parse // 很多東西

*/
