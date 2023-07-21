// WIP

import { readAllRawImages, readAllSavedImages } from './utils.js'

start()

function start() {
  // const savedImages = readAllSavedImages()
  // console.log('savedImages:', savedImages)
  // return

  const rawImages = readAllRawImages()
  console.log('rawImages:', rawImages)
}

/*

fs.lstatSync // 如果是 symbol link 的話，不會去找 target, 會回傳 symbol link 的 info
fs.statSync // 會去找 target 的 info
path.seq // string, / or \
path.parse // 很多東西

https://nodejs.org/docs/latest-v18.x/api/path.html#pathsep
https://stackoverflow.com/questions/32478698/what-is-the-different-between-stat-fstat-and-lstat-functions-in-node-js

*/
