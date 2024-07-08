// If you want to run something, just do it here.

import fs from 'fs'
import path from 'path'

start()
function start() {
  const preparingList = readFilesRecursively('./raw-images')
    .filter((fileName) => /-preparing$/.test(fileName))
    .map((fileName) => path.resolve(fileName))

  preparingList.forEach((filePath) => fs.unlinkSync(filePath))
  console.log(`一共刪除了 ${preparingList.length} 筆正在準備的資料`)
}

function readFilesRecursively(pathStr, list = []) {
  fs.readdirSync(pathStr).forEach((name) => {
    const fullPath = path.join(pathStr, name)
    isDir(fullPath) ? readFilesRecursively(fullPath, list) : list.push(fullPath)
  })
  return list
}
function isDir(path) {
  return fs.lstatSync(path).isDirectory()
}
