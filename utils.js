import fs from 'fs'
import path from 'path'

export const EX_HOST = 'exhentai.org'
export const E_HOST = 'e-hentai.org'
export const SAVE_DIRECTORY = './saveImg'
export const RAW_IMAGES_DIRETORY = 'raw-images'
export const LOG_DIRECTORY = './log'
export const PREPARE_SUFFIX = '-preparing' // TODO(flyc): 這個也要去替換一下各個地方
export const MAC_STORE_FILE_NAME = '.DS_Store'

export const UNCOMPLETED_URL_LIST_LOG_PREFIX = 'uncompleted-url-list'
export const REUSED_LIST_LOG_PREFIX = 'reused-url-list'

export function createFolders() {
  if (!fs.existsSync(SAVE_DIRECTORY)) fs.mkdirSync(SAVE_DIRECTORY)
  if (!fs.existsSync(RAW_IMAGES_DIRETORY)) fs.mkdirSync(RAW_IMAGES_DIRETORY)
  if (!fs.existsSync(LOG_DIRECTORY)) fs.mkdirSync(LOG_DIRECTORY)
}

/**
 * @function readSettingJson
 * @returns {object|null}
 * */
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

export function normalizedUrl(url, errorDefault = null) {
  try {
    const { origin, pathname } = new URL(url)
    return `${origin}${pathname.replace(/\/$/, '')}`
  } catch (e) {
    return errorDefault
  }
}

// TODO(flyc): document
const RAW_TYPE_VALUE = 'raw'
const SAVED_TYPE_VALUE = 'saved'

/**
 * @typedef {Object} ImageInfo
 * @property {string} name - name only, exclude extension
 * @property {string} ext - png, jpg or something
 * @property {string} fullName - name.ext
 * @property {string} folder - one level parent folder name
 * @property {string} fullPath - start with root
 * @property {string} hash - unique key
 * @property {string} url
 * */
/**
 * @function readAllRawImages
 * @returns {ImageInfo[]|null}
 * */
export function readAllRawImages() {
  // 取出全部的後，過濾掉還在準備中的
  return fs
    .readdirSync(RAW_IMAGES_DIRETORY)
    .filter((name) => !new RegExp(`${PREPARE_SUFFIX}$`).test(name))
    .map((fullName) => {
      const fullPath = path.resolve(path.join(RAW_IMAGES_DIRETORY, fullName))
      return _getImageInfoByPath(fullPath, { type: RAW_TYPE_VALUE })
    })
}

/**
 * @function readAllSavedImages
 * @description TODO(flyc): document
 * */
export function readAllSavedImages() {
  return fs
    .readdirSync(SAVE_DIRECTORY)
    .filter((name) => fs.lstatSync(path.resolve(path.join(SAVE_DIRECTORY, name))).isDirectory())
    .reduce(
      (result, folder) => {
        const fullFolderPath = path.resolve(path.join(SAVE_DIRECTORY, folder))

        const images = fs.readdirSync(fullFolderPath).map((name) => {
          const fullPath = path.join(fullFolderPath, name)
          return _getImageInfoByPath(fullPath, { type: SAVED_TYPE_VALUE })
        })

        result.flatImages = [...result.flatImages, ...images]
        result.sortByFolder.push({ folderName: folder, images, url: _getUrlFromFolder(folder) })

        return result
      },
      { flatImages: [], sortByFolder: [] }
    )
}

// TODO(flyc): document
function _getUrlFromFolder(folderName) {
  return ['', ...folderName.match(/\w+/g).slice(-3)].join('/')
}

// TODO(flyc): document
function _getImageInfoByPath(fullPath, { type } = {}) {
  if (type == null) {
    console.error('Parameter `type` is required.')
    return null
  }

  const { dir, name, base: fullName } = path.parse(fullPath)
  const folder = dir.split(path.sep).pop()
  const ext = path.extname(fullPath).split('.').pop()

  let hashIndex = null
  const nameMatchedKeys = name.match(/\w+/g)
  if (type === RAW_TYPE_VALUE) {
    hashIndex = 0
  } else if (type === SAVED_TYPE_VALUE) {
    hashIndex = 1
  } else {
    console.error('_getImageInfoByPath: wrong parameter `type`, please check again.')
    return null
  }

  const hash = nameMatchedKeys[hashIndex]
  const url = ['', ...nameMatchedKeys.slice(hashIndex + 1)].join('/')

  return {
    name,
    ext,
    fullName,
    folder,
    fullPath,
    hash,
    url,
  }
}
