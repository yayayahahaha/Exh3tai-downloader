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
  PREPARE_SUFFIX,
  ILLEGAL_CHAR_REGEX,
} from './utils.js'

const handlePromise = (promise) => promise.then((r) => [r, null]).catch((e) => [null, e])
const getId = (url) => new URL(url).pathname.match(/\w+/g).join('-')
const showError = (where, content) => console.error(`[${where}] ${content}`)
const stepMessage = (content, length = 7) => {
  const headTail = Array(length).fill('=').join('')
  console.log()
  console.log(`${headTail} ${content} ${headTail}`)
}
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

console.log("Let's Go!")
createFolders()

const rawImagesMap = Object.fromEntries(readAllRawImages().map((info) => [info.hash, info.fullName]))

start()

async function start() {
  stepMessage('Load setting.json')
  const jsonContent = readSettingInfo()

  const { cookie, url: urlList, taskNumber = 4, workerCount = 1 } = jsonContent
  if (!Array.isArray(urlList) || isNaN(taskNumber)) return void showError('Parse setting.json', 'params error!')

  globalVariable.cookie = cookie
  globalVariable.taskNumber = taskNumber

  console.log('Load setting.json success')

  const urlListTask = urlList.map((settingUrl) => () => {
    return new Promise(_promise_callback)

    async function _promise_callback(resolve, reject) {
      const [response, getUrlError] = await getUrlInfo(settingUrl)
      if (getUrlError) return reject(getUrlError)

      const { url, endPage, id, directory } = response
      const [allImageLinkList, eachPageError] = await getEachPageImagesLink({ url, endPage, id, directory })
      if (eachPageError) return reject(eachPageError)

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

function readSettingInfo() {
  const content = fs.readFileSync('setting.json')
  let jsonContent = null

  try {
    jsonContent = JSON.parse(content)
  } catch (e) {
    showError('Parse setting.json', 'JSON.parse failed!')
    jsonContent = {}
  }

  return jsonContent
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
  let url = normalizedUrl(rawUrl)

  if (url == null) {
    showError('Wrong url', `${rawUrl} is not correct.`)
    return [null, new Error('Wrong url')]
  }

  stepMessage('Get Url Info')
  console.log(`current fetch url: ${url}`)

  const { host, protocol, pathname } = new URL(url)
  switch (host) {
    case E_HOST:
      break
    case EX_HOST:
      if (!globalVariable.cookie) {
        showError('Cookie missing', "Cookie cannot be empty when it's ex.")
        url = `${protocol}//${E_HOST}${pathname}`
        console.log(`try to fech it in E: ${url}\n`)
      }
      break
    default:
      showError('Wrong Url', `url is not e or ex: ${JSON.stringify(url)}`)
      return [null, new Error('Wrong Url')]
  }

  const [res, error] = await handlePromise(fetch(url, createRequestHeader()))
  if (error) {
    showError('getUrlInfo', 'get url basic info failed!')
    return [null, error]
  }
  const body = await res.text()
  const $ = cheerio.load(body)

  const endPage = getEndPage($)
  if (isNaN(endPage)) {
    showError('endPage', 'endPage is not a number')
    return [null, new Error('endPage is not a number')]
  }

  const title = $('title')
    .text()
    .replace(ILLEGAL_CHAR_REGEX, '_')
    .replace(/^_|_ExHentai_org$/g, '') // TODO(flyc): 這裡要看一下 E 會不會出問題
  const id = getId(url)
  const directory = path.join(SAVE_DIRECTORY, `${title}-${id}`)

  if (!fs.existsSync(directory)) fs.mkdirSync(directory)

  console.log('get url info success')
  console.log("gallery's title: " + title)
  console.log(`total page: ${endPage}`)
  console.log(`save in directory: ${directory}`)

  return [{ endPage, directory, id, title, url }, null]
}
