// TODO
// 1. 撰寫階段性的下載機制: 像是直接匯入已經進到某些頁面的網址之類的
// 雖然這樣說但 p=0 之類的其實沒有什麼區別..
// 再看看要用參數之類的去處理這件事情, 或是做檔案存在與否的檢查之類的
// 2. 做 url 的 "某個" 圖片後面的數目不會下載，用於過濾角色圖片和背景等

import fetch from 'node-fetch'
import fs from 'fs'
import cheerio from 'cheerio'
import { TaskSystem, download } from 'npm-flyc'
import crypto from 'crypto'

const defaultTaskSetting = (randomDelay = 0, retry = true) => ({ randomDelay, retry })

const SAVE_DIRECTORY = './saveImg'
const RAW_IMAGES_DIRETORY = './raw-images'

const handlePromise = (promise) => promise.then((r) => [r, null]).catch((e) => [null, e])
const getId = (url) => url.match(/\/\/exhentai.org\/([^?]*)?/)[1].replace(/\//g, '-')
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

const hashMe = (input) => crypto.createHash('sha256').update(input, 'utf8').digest('hex')

const globalVariable = {
  cookie: '',
  taskNumber: 2,
  folderMap: {},
}

console.log("Let's Go!")
if (!fs.existsSync(SAVE_DIRECTORY)) fs.mkdirSync(SAVE_DIRECTORY)
if (!fs.existsSync(RAW_IMAGES_DIRETORY)) fs.mkdirSync(RAW_IMAGES_DIRETORY)

start()

async function start() {
  stepMessage('Load setting.json')
  const jsonContent = readSettingInfo()

  const { cookie, url: urlList, taskNumber } = jsonContent
  if (!cookie || !urlList || isNaN(taskNumber)) return void showError('Parse setting.json', 'params error!')

  globalVariable.cookie = cookie
  globalVariable.taskNumber = taskNumber

  console.log('Load setting.json success')

  const urlListTask = urlList.map((settingUrl) => () => {
    return new Promise(_promise_callback)

    async function _promise_callback(resolve, reject) {
      const [response, getUrlError] = await getUrlInfo(settingUrl)
      if (getUrlError) return reject(getUrlError)

      const { url, endPage, id } = response
      const [allImageLinkList, eachPageError] = await getEachPageImagesLink({ url, endPage, id })
      if (eachPageError) return reject(eachPageError)

      const [, imageInfoError] = await getEachImageInfoAndDownload(allImageLinkList)
      if (imageInfoError) return reject(imageInfoError)

      stepMessage(`url ${settingUrl} 完成囉!`)
      console.log()
      return resolve()
    }
  })

  const taskAll = new TaskSystem(urlListTask, 1, defaultTaskSetting(500))
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

  const taskList = _create_task(allImageLinkList)

  const taskNumber = globalVariable.taskNumber
  const task_search = new TaskSystem(taskList, taskNumber, defaultTaskSetting(500))

  let allPagesImagesArray = (await task_search.doPromise()).filter((result) => result.status === 1)
  allPagesImagesArray = allPagesImagesArray.map(({ data }) => data)

  return [allPagesImagesArray, null]

  function _create_task(list) {
    return list.map((info) => {
      const { eachPageUrl } = info

      return function () {
        return new Promise(_getEachImageInfoAndDownloadPromise)
      }

      async function _getEachImageInfoAndDownloadPromise(resolve, reject) {
        const [res, error] = await handlePromise(fetch(eachPageUrl, createRequestHeader()))
        if (error) {
          showError('getImgSrcByLink', 'api errur!')
          return reject(error)
        }

        const body = await res.text()
        const $ = cheerio.load(body)
        const linkObj = { ...info }
        const imageDom = $('#img')

        const src = imageDom.attr('src')
        linkObj.src = src
        if (src == null) {
          console.log('[ERROR] src is not exist!', JSON.stringify(info, null, 2))
          return reject()
        }
        linkObj.type = src.match(/\.(\w+)$/)[1]

        // 直接下載圖片
        const { sort, name, type, id } = linkObj
        const { directory } = globalVariable.folderMap[id]
        const filePath = `${directory}/${sort}-${name}.${type}`
        download(src, filePath, { headers: { Cookie: globalVariable.cookie } })
          .then(resolve)
          .catch(reject)
      }
    })
  }
}

async function getEachPageImagesLink({ endPage, url: rowUrl, id }) {
  stepMessage('getEachPageImagesLink')
  const { origin, pathname } = new URL(rowUrl)
  const url = `${origin}${pathname}`

  const permissionList = _createEachPageImagesLinkTask(url, endPage)

  const taskNumber = globalVariable.taskNumber
  const task_search = new TaskSystem(permissionList, taskNumber, defaultTaskSetting())

  let allPagesImagesArray = (await task_search.doPromise()).filter((result) => result.status === 1)
  allPagesImagesArray = allPagesImagesArray
    .map(({ data }) => data)
    .reduce((list, pageInfo) => list.concat(pageInfo), [])
    .sort((a, b) => a.sort - b.sort)

  return [allPagesImagesArray, null]

  function _createEachPageImagesLinkTask(url, endPage) {
    return [...Array(endPage)].map((_, page) => {
      const urlWithPage = `${url}?p=${page}`

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
        const list = $('.gdtm a')
        const linkArray = [...list].map((item, index) => {
          const href = $(item).attr('href')

          return {
            id,
            url: url,
            hash: hashMe(href),
            eachPageUrl: href,
            name: href.split('/')[5],
            sort: 40 * page + index + 1,
          }
        })

        return resolve(linkArray)
      }
    })
  }
}

async function getUrlInfo(url) {
  stepMessage('Get Url Info')
  console.log(`current fetch url: ${url}`)

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

  const illegalCharRegex = /[^\u4e00-\u9fa5_a-zA-Z0-9]+/g
  const title = $('title')
    .text()
    .replace(illegalCharRegex, '_')
    .replace(/^_|_ExHentai_org$/g, '')
  const directory = SAVE_DIRECTORY + '/' + title
  const id = getId(url)
  globalVariable.folderMap[id] = { directory, endPage, id, title, url }

  if (!fs.existsSync(directory)) fs.mkdirSync(directory)

  console.log('get url info success')
  console.log("gallery's title: " + title)
  console.log(`total page: ${endPage}`)
  console.log(`save in directory: ${directory}`)

  return [{ endPage, directory, id, title, url }, null]
}
