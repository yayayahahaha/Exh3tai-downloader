import { createFolders, readAllRawImages, readAllSavedImages, readSettingJson } from './utils.js'

start()

function start() {
  createFolders()

  const setting = readSettingJson()
  if (setting == null) return

  const { makeItReal: folderNames } = setting
  if (!Array.isArray(folderNames)) return // TODO(flyc): warning message

  const savedImages = readAllSavedImages()
  const rawImages = readAllRawImages()
  const rawImageMap = Object.fromEntries(rawImages.map((image) => [image.hash, image]))

  const folderNameMap = Object.fromEntries(folderNames.map((name) => [name, true]))
  console.log('folderNameMap:', folderNameMap)

  const filteredImages = savedImages.flatImages
    .filter((image) => folderNameMap[image.folder])
    .map((image) => ({
      name: image.fullName,
      rawPath: rawImageMap[image.hash].fullPath,
    }))
}
