import { readAllRawImages, readSettingJson } from './utils.js'

start()

function start() {
  const setting = readSettingJson()
  console.log('setting:', setting)

  const rawImages = readAllRawImages()
  console.log(rawImages.length)
}
