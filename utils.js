import fs from 'fs'

export const BASE_URL = 'https://exhentai.org'
export const SAVE_DIRECTORY = './saveImg'
export const RAW_IMAGES_DIRETORY = './raw-images'
export const LOG_DIRECTORY = './log'

export const UNCOMPLETED_URL_LIST_LOG_PREFIX = 'uncompleted-url-list'
export const REUSED_LIST_LOG_PREFIX = 'reused-url-list'

export function createFolders() {
  if (!fs.existsSync(SAVE_DIRECTORY)) fs.mkdirSync(SAVE_DIRECTORY)
  if (!fs.existsSync(RAW_IMAGES_DIRETORY)) fs.mkdirSync(RAW_IMAGES_DIRETORY)
  if (!fs.existsSync(LOG_DIRECTORY)) fs.mkdirSync(LOG_DIRECTORY)
}

export function readSettingJson() {
  if (!fs.existsSync('setting.json')) {
    console.log("There's no setting.json file.")
    return null
  }

  try {
    return JSON.parse(fs.readFileSync('setting.json'))
  } catch (e) {
    console.log('Parse setting.json file error!')
    return null
  }
}
