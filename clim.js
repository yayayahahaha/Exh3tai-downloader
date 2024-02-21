import fetch from 'node-fetch'
import fs from 'fs'
import cheerio from 'cheerio'
import { TaskSystem, download } from 'npm-flyc'
import path from 'path'

const defaultTaskSetting = (randomDelay = 0, retry = true) => ({ randomDelay, retry })

import {
  SAVE_DIRECTORY,
  RAW_IMAGES_DIRETORY,
  createFolders,
  E_HOST,
  EX_HOST,
  normalizedUrl,
  readAllRawImages,
  showError,
  readSettingInfo,
  checkParam,
  stepMessage,
  PREPARE_SUFFIX,
  ILLEGAL_CHAR_REGEX,
  TAIL_CHAR_REGEX,
} from './utils.js'

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
  console.log("Let's Go!")

  // Create needed folders
  stepMessage('Create needed folders')
  createFolders()
  console.log('Create folders success')

  stepMessage('Load setting.json')
  const jsonContent = readSettingInfo()
  if (jsonContent == null) return
  if (!checkParam(jsonContent)) return

  const { cookie, url: urlList, taskNumber = 4, workerCount = 1 } = jsonContent

  // TODO 看能不能拿掉這兩個 global variable
  globalVariable.cookie = cookie
  globalVariable.taskNumber = taskNumber

  console.log('Load setting.json success')

  const urlListTask = urlList.map((settingUrl) => () => {
    return new Promise(_promise_callback)

    async function _promise_callback(resolve, reject) {
      // 取得 url 的基本資訊
      const [response, getUrlError] = await getUrlInfo(settingUrl)
      if (getUrlError) return reject(getUrlError)

      // 根據娶回來的基本資訊去 fetch 每一頁的詳細資料
      const { url, endPage, id, directory } = response
      const [allImageLinkList, eachPageError] = await getEachPageImagesLink({ url, endPage, id, directory })
      if (eachPageError) return reject(eachPageError)

      // 實際開始下載
      const [, imageInfoError] = await getEachImageInfoAndDownload(allImageLinkList)
      if (imageInfoError) return reject(imageInfoError)

      stepMessage(`url ${settingUrl} 完成囉!`)
      console.log()
      return resolve()
    }
  })

  const taskAll = new TaskSystem(urlListTask, workerCount, defaultTaskSetting(500))
  await taskAll.doPromise()

  stepMessage('全部完成囉!!!!')
}

async function getEachImageInfoAndDownload(allImageLinkList) {
  stepMessage('getEachImageInfoAndDownload')

  const taskList = await _create_task(allImageLinkList)

  const taskNumber = globalVariable.taskNumber
  const task_search = new TaskSystem(taskList, taskNumber, defaultTaskSetting(500))

  let allPagesImagesArray = (await task_search.doPromise()).filter((result) => result.status === 1)
  allPagesImagesArray = allPagesImagesArray.map(({ data }) => data)

  return [allPagesImagesArray, null]

  async function _create_task(list) {
    const result = await Promise.all(
      list.map((info) => {
        const { eachPageUrl, hash, sort, id, extension, directory } = info
        const filePath = path.resolve(`${directory}/${sort}-${hash}-${id}.${extension}`)
        const cachedName = rawImagesMap[hash]

        let rawFileName = `${hash}-${id}.${extension}`
        let relativeRawPath = path.join(RAW_IMAGES_DIRETORY, rawFileName)
        let rawPath = path.resolve(relativeRawPath)

        if (cachedName != null) {
          if (fs.existsSync(filePath)) return null

          relativeRawPath = path.join(RAW_IMAGES_DIRETORY, cachedName)
          rawPath = path.resolve(relativeRawPath)

          return new Promise((resolve) => {
            fs.symlink(rawPath, filePath, 'file', (error) => {
              if (error) {
                console.log('create link error', rawPath, filePath)
                console.log(error)
                return resolve(() => Promise.reject(error))
              } else return resolve(null)
            })
          })
        }

        return function () {
          return new Promise(_getEachImageInfoAndDownloadPromise)
        }

        async function _getEachImageInfoAndDownloadPromise(resolve, reject) {
          if (fs.existsSync(filePath)) return resolve()

          const [res, error] = await handlePromise(fetch(eachPageUrl, createRequestHeader()))
          if (error) {
            showError('getImgSrcByLink', 'api errur!')
            return reject(error)
          }

          const body = await res.text()
          const $ = cheerio.load(body)
          const imageDom = $('#img')

          const src = imageDom.attr('src')
          if (src == null) {
            console.log('[ERROR] src is not exist!', JSON.stringify(info, null, 2))
            return reject()
          }

          // 下載圖片到 raw-images, 然後再 link
          download(src, `${relativeRawPath}${PREPARE_SUFFIX}`, { headers: { Cookie: globalVariable.cookie || '' } })
            .then(() => {
              rawImagesMap[hash] = rawFileName

              fs.renameSync(`${relativeRawPath}${PREPARE_SUFFIX}`, relativeRawPath)

              fs.symlink(rawPath, filePath, 'file', (error) => {
                if (error) {
                  console.log('create link error', rawPath, filePath)
                  console.log(error)
                  reject(error)
                } else resolve()
              })
              return resolve()
            })
            .catch((error) => {
              reject(error)
            })
        }
      })
    )
    return result.filter(Boolean)
  }
}

async function getEachPageImagesLink({ endPage, url: rawUrl, id, directory }) {
  stepMessage('getEachPageImagesLink')
  const { origin, pathname } = new URL(rawUrl)
  const url = `${origin}${pathname}`

  const permissionList = _createEachPageImagesLinkTask({ url, endPage, directory })

  const taskNumber = globalVariable.taskNumber
  const task_search = new TaskSystem(permissionList, taskNumber, defaultTaskSetting())

  let allPagesImagesArray = (await task_search.doPromise()).filter((result) => result.status === 1)
  allPagesImagesArray = allPagesImagesArray
    .map(({ data }) => data)
    .reduce((list, pageInfo) => list.concat(pageInfo), [])
    .sort((a, b) => a.sort - b.sort)

  return [allPagesImagesArray, null]

  function _createEachPageImagesLinkTask({ url, endPage, directory }) {
    return [...Array(endPage)].map((_, page) => {
      const urlInstance = new URL(url)
      urlInstance.searchParams.append('p', page)
      const urlWithPage = urlInstance.href

      return function () {
        return new Promise(_eachPageLinkPromise)
      }

      async function _eachPageLinkPromise(resolve, reject) {
        const [res, error] = await handlePromise(fetch(urlWithPage, createRequestHeader()))
        if (error) {
          showError(`get ${urlWithPage}`, 'api request failed')
          return reject(error)
        }

        const body = await res.text()
        const $ = cheerio.load(body)
        const list = $('#gdt a')
        const linkArray = [...list].map((item, index) => {
          const href = $(item).attr('href')
          const imageTitle = $(item).find('img').attr('title')
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

        return resolve(linkArray)
      }
    })
  }
}

async function getUrlInfo(rawUrl) {
  // 正規化 url
  const urlInfo = normalizedUrl(rawUrl)
  if (urlInfo == null) {
    showError('Wrong url', `${rawUrl} is not correct.`)
    return [null, new Error('Wrong url')]
  }

  const { currentUrl: url } = urlInfo
  const { host } = new URL(url)

  // 根據當前的 fetch 網址，判斷 cookie 是不是空的 or url 是錯的
  switch (host) {
    case E_HOST:
      break

    case EX_HOST:
      if (!globalVariable.cookie) {
        showError('Cookie missing', "Cookie cannot be empty when it's ex.")
        return [null, new Error("Cookies' missing")]
      }
      break

    default:
      showError('Wrong Url', `url is not e or ex: ${JSON.stringify(url)}`)
      return [null, new Error('Wrong Url')]
  }

  stepMessage('Get Url Info')
  console.log(`current fetch url: ${url}`)

  // 實際開始拉取
  const [res, error] = await handlePromise(fetch(url, createRequestHeader()))
  if (error) {
    showError('getUrlInfo', `get url '${url}'' basic info failed!`)

    if (urlInfo.failAndCheckRetry()) return getUrlInfo(urlInfo)
    return [null, error]
  }

  // 取得 pageNumber, 就算 fetch 成功也可能沒有 pageNumber
  const body = await res.text().catch((r) => console.log('r?', r))
  const $ = cheerio.load(body)
  const endPage = getEndPage($)
  if (isNaN(endPage)) {
    showError('endPage', 'endPage is not a number')

    if (urlInfo.failAndCheckRetry()) return getUrlInfo(urlInfo)
    return [null, new Error('endPage is not a number')]
  }

  // 取得基本的資料後回傳
  const title = $('title').text().replace(ILLEGAL_CHAR_REGEX, '_').replace(TAIL_CHAR_REGEX, '')
  const id = getId(url)
  const directory = path.join(SAVE_DIRECTORY, `${title}-${id}`)

  if (!fs.existsSync(directory)) fs.mkdirSync(directory)

  console.log('get url info success')
  console.log("gallery's title: " + title)
  console.log(`total page: ${endPage}`)
  console.log(`save in directory: ${directory}`)

  return [{ endPage, directory, id, title, url }, null]
}
