import { readAllSavedImages } from './utils.js'

start()

function start() {
  console.log(readAllSavedImages().flatImages[0])

  const folderNames = readAllSavedImages().sortByFolder.map((info) => info.folderName)

  console.log(folderNames)
}
