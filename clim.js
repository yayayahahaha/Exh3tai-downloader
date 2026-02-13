// 針對單張圖片下載失敗時，由於會被 settled 過濾掉的關係、所以最後送出的還是成功的
// 這部分也要 throw 成失敗給外層捕捉才行

import fetch from 'node-fetch'
import fs from 'fs'
import cheerio from 'cheerio'
import { download } from 'npm-flyc'
import path from 'path'

import {
  SAVE_DIRECTORY,
  RAW_IMAGES_DIRETORY,
  createFolders,
  E_HOST,
  EX_HOST,
  normalizedUrl,
  readAllRawImages,
  readSettingInfo,
  checkParam,
  PREPARE_SUFFIX,
  ILLEGAL_CHAR_REGEX,
  TAIL_CHAR_REGEX,
} from './utils.js'
import { addToFavorite, ErrorRes } from './favorate.js'
import {
  blue,
  cyan,
  green,
  lightBlue,
  lightCyan,
  lightGreen,
  lightMagenta,
  lightRed,
  lightYellow,
  magenta,
  red,
  yellow,
} from './console-color.js'
import pLimit from 'p-limit'

const handlePromise = (promise) => promise.then((r) => [r, null]).catch((e) => [null, e])
const getId = (url) => new URL(url).pathname.match(/\w+/g).join('-')

const getEndPage = ($) => {
  const pagerSelector = 'table.ptt td'
  const pagers = $(pagerSelector)
  const lastPageIndex = pagers.length - 2
  const totalPage = $(pagers[lastPageIndex]).text()

  return parseInt(totalPage, 10)
}
const createRequestHeader = (url) => ({
  url,
  headers: { Cookie: globalVariable.cookie },
  jar: url ? true : undefined,
})

const globalVariable = {
  cookie: '',
  taskNumber: 2,
}

const rawImagesMap = Object.fromEntries(readAllRawImages().map((info) => [info.hash, info.fullName]))

start()

async function start() {
  console.log(lightYellow(`Let's Go!`))

  // Create needed folders
  console.log(lightBlue('創建需要的資料夾'))
  createFolders()
  console.log(lightGreen('> 需要的資料夾創建成功'))

  // Read settings
  console.log(lightBlue('讀取設定檔'))
  const jsonContent = readSettingInfo()
  if (jsonContent == null) return console.log(lightRed('設定檔讀取失敗!'))
  if (!checkParam(jsonContent)) return console.log(lightRed('設定檔參數檢查失敗!'))
  console.log(lightGreen('> 設定檔讀取成功'))

  const { cookie, url: urlList, taskNumber = 4, workerCount = 1 } = jsonContent

  // TODO 看能不能拿掉這兩個 global variable
  globalVariable.cookie = cookie
  globalVariable.taskNumber = taskNumber

  let finishedCount = 0
  const urlLimit = pLimit(workerCount)

  const urlListTask = urlList.map((settingUrl) => {
    return urlLimit(async function () {
      return addToFavorite(settingUrl, cookie)
        .then(() => {
          // 取得 url 的基本資訊
          return getUrlInfo(settingUrl)
        })
        .then((response) => {
          // 根據取回來的基本資訊去 fetch 每一頁的詳細資料
          const { url, endPage, id, directory } = response
          return Promise.all([getEachPageImagesLink({ url, endPage, id, directory }), response])
        })
        .then(([allImageLinkList, basicInfo]) => {
          // 實際開始下載
          return getEachImageInfoAndDownload(allImageLinkList, basicInfo)
        })
        .then(() => {
          console.log(lightGreen(`✨ url ${settingUrl} 完成囉 ✨`))

          finishedCount++
          console.log(`\n🕰️ ${finishedCount}/${urlList.length}\n`)
        })
        .catch((errorInfo) => {
          const { error, type } = errorInfo

          switch (type) {
            case ErrorRes.TYPE_MAP.FAVORITE:
              ErrorRes.TYPE_INFO_MAP.FAVORITE.logError(settingUrl, error)
              throw error
          }

          console.log(lightRed('未知錯誤'), errorInfo)
          throw errorInfo
        })
    })
  })

  console.log(lightBlue('\n💃💃💃 開始跑流程囉 💃💃💃'))
  console.log(cyan('總需處理筆數:'), urlListTask.length)
  console.log(cyan('工人數:'), workerCount)
  console.log()

  Promise.all(urlListTask)
    .then(() => {
      console.log(lightGreen('✨✨✨ 全部完成囉 ✨✨✨'))
    })
    .catch(() => {
      console.log(lightRed('🕷️🕷️🕷️ 中間有失敗喔 🕷️🕷️🕷️ '))
    })
}

async function getEachImageInfoAndDownload(allImageLinkList, basicInfo) {
  const { id } = basicInfo

  console.log(lightMagenta(`開始下載 ${id} 的圖片`))

  const imagesLimit = pLimit(globalVariable.taskNumber)
  const taskList = _create_task(allImageLinkList)

  return Promise.allSettled(taskList).then((settledResult) => {
    return settledResult.filter((item) => item.status === 'fulfilled').map(({ value }) => value)
  })

  function _create_task(oriList) {
    let finished = 0
    let leftCount = 0
    const leftMapMsg = {}

    function checkHintOrNot() {
      const HINT_NUMBER = 1
      return leftCount <= HINT_NUMBER
    }

    const list = oriList.map((info) => ({
      ...info,
      finished: false,
      key: `${info.id}-${info.sort}`,
      messages: null,
    }))

    const record = Object.fromEntries(list.map((info) => [info.key, info]))

    return list
      .map((info) => {
        const { eachPageUrl, hash, sort, id, extension, directory } = info

        // region cache part
        const filePath = path.resolve(`${directory}/${sort}-${hash}-${id}.${extension}`)
        const cachedName = rawImagesMap[hash]
        let rawFileName = `${hash}-${id}.${extension}`
        let relativeRawPath = path.join(RAW_IMAGES_DIRETORY, rawFileName)
        let rawPath = path.resolve(relativeRawPath)

        if (cachedName != null) {
          if (fs.existsSync(filePath)) {
            info.messages = (finished) => [
              cyan(`${finished}/${allImageLinkList.length}`),
              blue(`${id} 的 ${sort} 已有 cache 且已有連結，直接結束執行緒`),
            ]

            return [async () => info, info]
          }

          relativeRawPath = path.join(RAW_IMAGES_DIRETORY, cachedName)
          rawPath = path.resolve(relativeRawPath)

          return [
            async function () {
              fs.symlinkSync(rawPath, filePath, 'file')

              info.messages = (finished) => [
                cyan(`${finished}/${allImageLinkList.length}`),
                blue(`${id} 的 ${sort} 已有 cache, 連結後結束執行緒`),
              ]

              return info
            },
            info,
          ]
        }
        // endregion cache part
        if (fs.existsSync(filePath)) {
          info.messages = (finished) => [green(`${filePath} 已經存在`)]
          return [async () => info, info]
        }

        return [
          async function () {
            // 這個可以用來測試 task 到底有沒有作用
            // console.log(`正要開始下載: ${eachPageUrl}`)

            return fetch(eachPageUrl, createRequestHeader())
              .then((res) => res.text())
              .then(async (body) => {
                const $ = cheerio.load(body)
                const imageDom = $('#img')

                const src = imageDom.attr('src')
                if (src == null) {
                  console.log(lightRed(`${id} 的 ${sort} 的 img 沒有 src !`))
                  throw new ErrorRes(ErrorRes.TYPE_MAP.IMAGE_SRC_NOT_EXIST, new Error('image src not exist'))
                }

                // 下載圖片到 raw-images, 然後再 link
                return download(src, `${relativeRawPath}${PREPARE_SUFFIX}`, {
                  headers: { Cookie: globalVariable.cookie || '' },
                }).catch((error) => {
                  console.log('error:', error)
                  console.log(lightRed(`${id} 的 ${sort} 下載失敗!`), src)
                  throw new ErrorRes(ErrorRes.TYPE_MAP.IMAGEDOWN_LOAD_FAILED, new Error(error))
                })
              })
              .then(() => {
                rawImagesMap[hash] = rawFileName

                fs.renameSync(`${relativeRawPath}${PREPARE_SUFFIX}`, relativeRawPath)
                fs.symlinkSync(rawPath, filePath, 'file')
              })
              .then(() => {
                info.messages = (finished) => [
                  cyan(`${finished}/${allImageLinkList.length}`),
                  green(`${id} 的 ${sort} 下載完畢`),
                ]

                return info
              })
          },
          info,
        ]
      })
      .map(([promiseFn, info]) => {
        return [
          () =>
            promiseFn().then((info) => {
              finished++
              record[info.key].finished = true
              return info
            }),
          info,
        ]
      })
      .map(([resolvePromiseFn, info]) => Promise.all([imagesLimit(resolvePromiseFn), info]))
      .map((promiseAll) => {
        return promiseAll.then((promiseAllResult) => {
          const info = promiseAllResult[1]

          // 這個是要顯示的必要訊息
          console.log(...info.messages(finished))

          const leftList = Object.values(record).filter((item) => !item.finished)
          leftCount = leftList.length

          if (checkHintOrNot() && !leftMapMsg[leftCount]) {
            leftMapMsg[leftCount] = true
            console.log(`${id} 剩 ${leftCount} 個: ${leftList.map((item) => item.eachPageUrl)}`)
          }
        })
      })
  }
}

async function getEachPageImagesLink({ endPage, url: rawUrl, id, directory }) {
  console.log(lightCyan(`🎀 開始取得 ${id} 的每一頁的資訊`))

  if (rawUrl == null) throw new Error(red('getEachPageImagesLink: rawUrl 為 nullish'))

  const { origin, pathname } = new URL(rawUrl)

  const url = `${origin}${pathname}`

  const pageLimit = pLimit(globalVariable.taskNumber)

  const permissionList = [...Array(endPage)].map((_, page) =>
    pageLimit(async function () {
      const urlInstance = new URL(url)
      urlInstance.searchParams.append('p', page)
      const urlWithPage = urlInstance.href

      return fetch(urlWithPage, createRequestHeader())
        .then((res) => res.text())
        .then((body) => {
          const $ = cheerio.load(body)
          const list = $('#gdt a')
          const linkArray = [...list].map((item, index) => {
            const href = $(item).attr('href')
            const imageTitle = $(item).find('div[title]').attr('title')
            const extension = imageTitle.match(/\.(\w+)$/)[1]
            const [hash, name] = new URL(href).pathname.split('/').slice(-2)

            return {
              id,
              url: url,
              hash,
              extension,
              eachPageUrl: href,
              name: `${hash}-${name}`,
              sort: 40 * page + index + 1,
              directory,
            }
          })

          return linkArray
        })
        .catch((error) => {
          console.log(lightRed(`取得 ${id} 的第 ${page} 頁失敗!`), error)
          throw ErrorRes(ErrorRes.TYPE_MAP.PAGE_INFO_FAILED, new Error(error))
        })
    })
  )

  return Promise.allSettled(permissionList).then((settledList) => {
    const result = settledList
      .filter((result) => result.status === 'fulfilled')
      .map(({ value }) => value)
      .reduce((list, pageInfo) => list.concat(pageInfo), [])
      .sort((a, b) => a.sort - b.sort)
      .map((item, index) => ({ ...item, sort: index + 1 }))

    console.log(yellow(`取得 ${id} 所有頁面資訊成功, 共 ${result.length} 筆資料`))
    return result
  })
}

async function getUrlInfo(rawUrl) {
  // 正規化 url
  const urlInfo = normalizedUrl(rawUrl)
  if (urlInfo == null) {
    throw new ErrorRes(ErrorRes.TYPE_MAP.NORMALIZED_URL, new Error('normalized url error'))
  }

  const { currentUrl: url } = urlInfo
  const { host } = new URL(url)

  // 根據當前的 fetch 網址，判斷 cookie 是不是空的 or url 是錯的
  switch (host) {
    case E_HOST:
      break

    case EX_HOST:
      if (!globalVariable.cookie) {
        console.log(lightRed('Cookie missing'))
        throw new ErrorRes(ErrorRes.TYPE_MAP.COOKIES_MISSING, new Error('EX_HOST 缺少 Cookies'))
      }
      break

    default:
      console.log(lightRed('Wrong Url'))
      throw new ErrorRes(ErrorRes.TYPE_MAP.WRONG_URL, new Error('url is not e or ex'))
  }

  console.log(lightCyan(`🦀 開始取得作品的資訊`))
  console.log(cyan('當前 url: '), url)

  // 實際開始拉取
  const [res, error] = await handlePromise(fetch(url, createRequestHeader()))
  if (error) {
    console.log(red(`取得 ${url} 的基本資訊失敗!`))

    if (urlInfo.failAndCheckRetry()) {
      console.log(magenta(`${url} 還有嘗試機會，繼續嘗試..`))
      return getUrlInfo(urlInfo)
    }
    console.log(lightRed(`取得 ${url} 的基本資訊失敗且嘗試機會已經沒了!`))
    throw new ErrorRes(ErrorRes.TYPE_MAP.BASIC_INFO_FAILED, new Error('get basic info failed'))
  }

  // 取得 pageNumber, 就算 fetch 成功也可能沒有 pageNumber
  const body = await res.text()
  const $ = cheerio.load(body)
  const endPage = getEndPage($)

  if (isNaN(endPage) || body === '') {
    console.log(red(`取得 ${url} 的頁碼資訊失敗!`))

    if (urlInfo.failAndCheckRetry()) {
      console.log(magenta(`${url} 還有嘗試機會，繼續嘗試..`))
      return getUrlInfo(urlInfo)
    }

    if (body === '') {
      console.log(lightYellow('收到的 body 為空字串! 可能是 cookie 過期了，請更新 cookie 的 igneous 欄位後再試一次'))
      return new ErrorRes(ErrorRes.TYPE_MAP.PAGE_NUMBER_FAILED, new Error('body is an empty string'))
    }

    console.log(lightRed(`取得 ${url} 的頁碼資訊失敗且嘗試機會已經沒了!`))
    return new ErrorRes(ErrorRes.TYPE_MAP.PAGE_NUMBER_FAILED, new Error('endPage is not a number'))
  }

  // 取得基本的資料後回傳
  const title = $('title').text().replace(ILLEGAL_CHAR_REGEX, '_').replace(TAIL_CHAR_REGEX, '')
  const id = getId(url)
  const directory = path.join(SAVE_DIRECTORY, `${title}-${id}`)

  if (!fs.existsSync(directory)) fs.mkdirSync(directory)

  console.log(green(`🐳 取得 ${url} 的基本資料成功`))
  console.log(cyan('標題:'), lightYellow(title))
  console.log(cyan('ID:'), lightYellow(id), cyan('總頁數:'), endPage)
  console.log(cyan('儲存的資料夾:'), directory)

  return { endPage, directory, id, title, url }
}
