import fs from 'fs'
import path from 'path'
import { lightGreen, lightRed, yellow } from './console-color.js'

export const EX_HOST = 'exhentai.org'
export const E_HOST = 'e-hentai.org'
export const SAVE_DIRECTORY = './saveImg'
export const RAW_IMAGES_DIRETORY = 'raw-images'
export const LOG_DIRECTORY = './log'
export const PREPARE_SUFFIX = '-preparing'
export const REAL_IMAGES_DIRECTORY = './real-images'
export const ROTATE_90_DIRECTORY = './rotate-90'

export const UNCOMPLETED_URL_LIST_LOG_PREFIX = 'uncompleted-url-list'
export const REUSED_LIST_LOG_PREFIX = 'reused-url-list'
export const PRUNE_UNLINK_FILES_LOG_PREFIX = 'unlinked-url'
export const DUPLICATE_FOLDER_LOG_PREFIX = 'duplicate-folder'

const MAC_CONFIG_FILE = '.DS_Store'
const ONLY_PATH_REG_EXP = new RegExp(`^/g/\\w+/\\w+.*$`)
export const ILLEGAL_CHAR_REGEX = /[^\u4e00-\u9fa5_a-zA-Z0-9]+/g
export const TAIL_CHAR_REGEX = /^_|_ExHentai_org$|_E_Hentai_Galleries?$/g

const addProtocolPrifix = (path, host = E_HOST) => `https://${host}${path}`
export const showError = (where, content) => console.log(lightRed(`[${where}] ${content}`))
export const stepMessage = (content, length = 7) => {
  const headTail = Array(length).fill('=').join('')
  console.log()
  console.log(`${headTail} ${content} ${headTail}`)
}

export function createFolders() {
  if (!fs.existsSync(SAVE_DIRECTORY)) fs.mkdirSync(SAVE_DIRECTORY)
  if (!fs.existsSync(RAW_IMAGES_DIRETORY)) fs.mkdirSync(RAW_IMAGES_DIRETORY)
  if (!fs.existsSync(LOG_DIRECTORY)) fs.mkdirSync(LOG_DIRECTORY)
  if (!fs.existsSync(REAL_IMAGES_DIRECTORY)) fs.mkdirSync(REAL_IMAGES_DIRECTORY)
  if (!fs.existsSync(ROTATE_90_DIRECTORY)) fs.mkdirSync(ROTATE_90_DIRECTORY)
}

/**
 * @function readSettingJson
 * @returns {object|null}
 * */
export function readSettingJson() {
  if (!fs.existsSync('setting.json')) {
    console.log(lightRed(`There's no setting.json file.`))
    return null
  }

  try {
    return JSON.parse(fs.readFileSync('setting.json'))
  } catch (e) {
    console.log(lightRed('Parse setting.json file error!'))
    return null
  }
}

class NormalizedUrlInstance {
  #failedCount = 0
  #e
  #ex

  constructor(path) {
    this.#e = addProtocolPrifix(path, E_HOST)
    this.#ex = addProtocolPrifix(path, EX_HOST)
    this.#failedCount = 0

    return this
  }

  get currentUrl() {
    return this.#failedCount === 0 ? this.#e : this.#ex
  }

  get everTriedBoth() {
    return this.#failedCount >= 2
  }

  fail() {
    this.#failedCount++
  }

  failAndCheckRetry() {
    this.fail()
    return !this.everTriedBoth
  }
}

export function normalizedUrl(url, errorDefault = null) {
  if (url instanceof NormalizedUrlInstance) return url

  if (ONLY_PATH_REG_EXP.test(url)) return new NormalizedUrlInstance(url)

  try {
    const { pathname } = new URL(url)
    return new NormalizedUrlInstance(pathname)
  } catch (e) {
    console.log(lightRed('[normalizedUrl] wrong url!', url, e))
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
 * @property {string} url - url without host
 * @property {object|null} detail - fs.statSync with getBase64 function: fs.readFileSync({path}, { encoding: 'base64' })
 * */
/**
 * @function readAllRawImages
 * @param {Object} [payload={}]
 * @param {boolean} [payload.readDetail=false] - put fs.statSync info `detail`
 * @returns {ImageInfo[]|null}
 * */
export function readAllRawImages({ readDetail = false } = {}) {
  // 取出全部的後，過濾掉還在準備中的
  return fs
    .readdirSync(RAW_IMAGES_DIRETORY)
    .filter((name) => name !== MAC_CONFIG_FILE && !new RegExp(`${PREPARE_SUFFIX}$`).test(name))
    .map((fullName) => {
      const fullPath = path.resolve(path.join(RAW_IMAGES_DIRETORY, fullName))
      return _getImageInfoByPath(fullPath, { type: RAW_TYPE_VALUE, readDetail })
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

        const images = fs
          .readdirSync(fullFolderPath)
          .filter((name) => name !== MAC_CONFIG_FILE)
          .map((name) => {
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

/**
 * @function _getImageInfoByPath
 * @param {string} fullPath - full file path
 * @param {object} config
 * @param {RAW_TYPE_VALUE|SAVED_TYPE_VALUE} config.type
 * @param {boolean} [config.readDetail=false] - fs.statSync and bind getBase64 function
 * @returns {ImageInfo}
 * */
function _getImageInfoByPath(fullPath, { type, readDetail = false } = {}) {
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

  const hash = nameMatchedKeys?.[hashIndex] ?? null
  const url = nameMatchedKeys ? ['', ...nameMatchedKeys.slice(hashIndex + 1)].join('/') : ''

  const detail = !readDetail
    ? null
    : { ...fs.statSync(fullPath), getBase64: () => fs.readFileSync(fullPath, { encoding: 'base64' }) }

  return {
    name,
    ext,
    fullName,
    folder,
    fullPath,
    hash,
    url,
    detail,
  }
}

export function readSettingInfo() {
  const content = fs.readFileSync('setting.json')
  let jsonContent = null

  try {
    jsonContent = JSON.parse(content)
  } catch (e) {
    showError('Parse setting.json', 'JSON.parse failed!')
    jsonContent = null
  }

  return jsonContent
}

export function checkParam(jsonContent) {
  if (typeof jsonContent !== 'object' || jsonContent == null) return void showError('Paramsters error', 'json is null')

  const keys = [
    { value: 'cookie', type: 'string', validate: (value) => typeof value === 'string' },
    { value: 'taskNumber', type: 'number', validate: (value) => typeof value === 'number' },
    { value: 'workerCount', type: 'number', validate: (value) => typeof value === 'number' },
    { value: 'url', type: 'array', validate: (value) => Array.isArray(value) },
    { value: 'makeItReal', type: 'array', validate: (value) => Array.isArray(value) },
    { value: 'rotate-90', type: 'array', validate: (value) => Array.isArray(value) },
  ].filter((keyInfo) => jsonContent[keyInfo.value] !== undefined)

  const hasError = []
  for (let i = 0; i < keys.length; i++) {
    const { value, validate } = keys[i]
    const jsonValue = jsonContent[value]

    if (!validate(jsonValue)) hasError.push(keys[i])
  }

  if (hasError.length !== 0) {
    hasError.forEach(({ value, type }) => showError('Parameters error', `'${value}' should be an ${type}`))
    return false
  }

  return true
}

/**
 * 解析設定檔中的資料夾項目（支援資料夾名稱、指向 SAVE_DIRECTORY 底下的相對或絕對路徑）
 * @param {unknown} entry
 * @param {Set<string>} savedFolderSet
 * @returns {{ ok: true, folderName: string, notice?: string } | { ok: false, reason: string }}
 */
function _resolveSavedFolderEntry(entry, savedFolderSet) {
  if (typeof entry !== 'string' || entry.trim() === '') {
    return { ok: false, reason: `資料夾設定必須為非空字串: ${JSON.stringify(entry)}` }
  }

  const rawEntry = entry.trim()
  const saveRoot = fs.existsSync(SAVE_DIRECTORY) ? fs.realpathSync(SAVE_DIRECTORY) : path.resolve(SAVE_DIRECTORY)
  const isAbsPath = path.isAbsolute(rawEntry)
  const hasPathSeparator = rawEntry.includes('/') || rawEntry.includes('\\') || rawEntry === '.' || rawEntry === '..'

  if (isAbsPath || hasPathSeparator) {
    const resolvedFromCwd = path.resolve(rawEntry)

    if (!fs.existsSync(resolvedFromCwd)) {
      const withoutTrailing = rawEntry.replace(/[\\/]+$/, '')
      if (!isAbsPath && !withoutTrailing.includes('/') && !withoutTrailing.includes('\\') && savedFolderSet.has(withoutTrailing)) {
        return {
          ok: true,
          folderName: withoutTrailing,
          notice: `已自動去除結尾斜線並解析為資料夾名稱: ${withoutTrailing}`,
        }
      }

      return {
        ok: false,
        reason: isAbsPath
          ? `路徑不存在（絕對路徑）: ${rawEntry}`
          : `在相對路徑與 ${SAVE_DIRECTORY} 底下皆找不到該資料夾: ${rawEntry}`,
      }
    }

    const realTarget = fs.realpathSync(resolvedFromCwd)
    if (!fs.statSync(realTarget).isDirectory()) {
      return { ok: false, reason: `目標路徑不是資料夾: ${rawEntry}` }
    }

    if (path.dirname(realTarget) === saveRoot) {
      const folderName = path.basename(realTarget)
      if (savedFolderSet.has(folderName)) {
        return {
          ok: true,
          folderName,
          notice: `已從${isAbsPath ? '絕對' : '相對'}路徑自動解析為資料夾名稱: ${folderName}`,
        }
      }
    }

    return {
      ok: false,
      reason: `不支援 ${SAVE_DIRECTORY} 以外的${isAbsPath ? '絕對' : '相對'}路徑: ${rawEntry}`,
    }
  }

  if (savedFolderSet.has(rawEntry)) {
    return { ok: true, folderName: rawEntry }
  }

  const candidateInSave = path.resolve(SAVE_DIRECTORY, rawEntry)
  if (fs.existsSync(candidateInSave) && !fs.statSync(candidateInSave).isDirectory()) {
    return { ok: false, reason: `目標不是資料夾: ${rawEntry}` }
  }

  return { ok: false, reason: `在 ${SAVE_DIRECTORY} 底下找不到資料夾: ${rawEntry}` }
}

/**
 * 讀取設定檔並將指定資料夾的實體圖片從 raw-images 複製到目標目錄
 * @param {object} options
 * @param {string} options.settingKey - setting.json 內的欄位名稱
 * @param {string} options.targetDirectory - 目標輸出根目錄
 * @param {string} options.actionLabel - 終端機提示標題
 * @returns {{ copiedFiles: string[], errors: object[], hasError: boolean } | null}
 */
export function exportSavedImagesToDirectory({ settingKey, targetDirectory, actionLabel }) {
  const setting = readSettingJson()
  if (setting == null) return null

  const folderEntries = setting[settingKey]
  if (!Array.isArray(folderEntries)) {
    showError(settingKey, `setting.json 的 "${settingKey}" 欄位不存在或不是陣列`)
    return null
  }

  createFolders()

  if (folderEntries.length === 0) {
    console.log(yellow(`[${settingKey}] setting.json 中沒有設定任何資料夾。`))
    return { copiedFiles: [], errors: [], hasError: false }
  }

  const savedImages = readAllSavedImages()
  const rawImages = readAllRawImages()
  const rawImageMap = Object.fromEntries(rawImages.filter((image) => image?.hash).map((image) => [image.hash, image]))
  const savedFolderMap = new Map(savedImages.sortByFolder.map((item) => [item.folderName, item]))
  const savedFolderSet = new Set(savedFolderMap.keys())

  console.log(`${actionLabel}的資料夾: `)
  folderEntries.forEach((folder, index) => console.log(`${index + 1}. ${folder}`))

  const errors = []
  const resolvedFolders = []
  const seenFolders = new Set()

  for (const entry of folderEntries) {
    const resolved = _resolveSavedFolderEntry(entry, savedFolderSet)
    if (!resolved.ok) {
      showError(settingKey, resolved.reason)
      errors.push({ type: 'invalid-folder', entry, message: resolved.reason })
      continue
    }

    if (resolved.notice) {
      console.log(yellow(`[${settingKey}] ${resolved.notice}`))
    }

    const { folderName } = resolved
    if (seenFolders.has(folderName)) {
      console.log(yellow(`[${settingKey}] 重複的資料夾設定，已略過: ${folderName}`))
      continue
    }

    const folderInfo = savedFolderMap.get(folderName)
    if (!folderInfo || folderInfo.images.length === 0) {
      console.log(yellow(`[${settingKey}] 資料夾內沒有任何圖片，已略過: ${folderName}`))
      continue
    }

    seenFolders.add(folderName)
    resolvedFolders.push(folderName)
  }

  const targetFolderSet = new Set(resolvedFolders)
  const copiedFiles = []

  for (const image of savedImages.flatImages) {
    if (!image || !targetFolderSet.has(image.folder)) continue

    const rawImage = image.hash ? rawImageMap[image.hash] : null
    if (!rawImage || !fs.existsSync(rawImage.fullPath)) {
      const msg = `找不到對應的 raw-images 檔案 (folder: ${image.folder}, file: ${image.fullName}, hash: ${image.hash})`
      showError(settingKey, msg)
      errors.push({ type: 'missing-raw', folder: image.folder, file: image.fullName, message: msg })
      continue
    }

    const fullFolder = path.resolve(path.join(targetDirectory, image.folder))
    const fullFileName = path.resolve(fullFolder, image.fullName)

    try {
      if (!fs.existsSync(fullFolder)) fs.mkdirSync(fullFolder, { recursive: true })
      fs.copyFileSync(rawImage.fullPath, fullFileName)
      copiedFiles.push(fullFileName)
    } catch (err) {
      const msg = `複製檔案失敗 (${image.fullName}): ${err.message}`
      showError(settingKey, msg)
      errors.push({ type: 'copy-failed', file: fullFileName, message: msg })
    }
  }

  if (errors.length === 0 && copiedFiles.length > 0) {
    console.log(lightGreen(`[${settingKey}] 已複製 ${copiedFiles.length} 張圖片到 ${targetDirectory}`))
  }

  return { copiedFiles, errors, hasError: errors.length > 0 }
}
