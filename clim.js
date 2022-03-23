const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const { head } = require('request')
const { getHeapCodeStatistics } = require('v8')
const { resolve } = require('dns')

const { TaskSystem, download } = require('npm-flyc')
const { end } = require('cheerio/lib/api/traversing')
const defaultTaskSetting = (randomDelay = 0) => ({ randomDelay })

const result = []
const srcArray = []
const countloaded = 0
const originTaskIndex = 16
const taskIndex = 16
const linkChunkArray = []
const chunkIndex = 0
const chunkNumber = 10

const SAVE_DIRECTORY = './saveImg'

const getId = url => url.match(/\/\/exhentai.org\/([^?]*)?/)[1].replace(/\//g, '-')
const showError = (where, content) => console.error(`[${where}] ${content}`)
const stepMessage = (content, length = 7) => {
  const headTail = Array(length).fill('=').join('')
  console.log()
  console.log(`${headTail} ${content} ${headTail}`)
}
const getEndPage = $ => {
  const pagerSelector = 'table.ptt td'
  const pager = $(pagerSelector)
  return parseInt($(pager[pager.length - 2]).text(), 10)
}
const createRequestHeader = url => ({
  url,
  headers: { Cookie: globalVariable.cookie },
  jar: true
})
const globalVariable = {
  cookie: '',
  folderMap: {}
}

console.log("Let's Go!")
if (!fs.existsSync(SAVE_DIRECTORY)) fs.mkdirSync(SAVE_DIRECTORY)

start()

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

async function start() {
  stepMessage('Load setting.json')
  const jsonContent = readSettingInfo()

  const { cookie, url: urlList } = jsonContent
  if (!cookie || !urlList) return void showError('Parse setting.json', 'attribute missing!')

  globalVariable.cookie = cookie

  console.log('Load setting.json success')

  const [response, getUrlError] = await getUrlInfo(0, { cookie, urlList })
  if (getUrlError) return // TODO error check

  const { url, endPage, id } = response
  const [allImageLinkList, eachPageError] = await getEachPageImagesLink({ url, endPage, id })
  if (eachPageError) return // TODO error check

  const [allImageInfoList, imageInfoError] = await getEachImageInfo(allImageLinkList)
  if (imageInfoError) return // TODO error check

  fs.writeFileSync('result.json', JSON.stringify(allImageInfoList, null, 2))

  await startDownload(allImageInfoList)
  console.log('完成囉!!!!')

  // TODO 遞迴檢查 getUrlInfo 的其他項目?
}

async function startDownload(list) {
  const taskList = _create_task(list)
  const taskNumber = 1
  const task_search = new TaskSystem(taskList, taskNumber, defaultTaskSetting(500))

  let allPagesImagesArray = (await task_search.doPromise()).filter(result => result.status === 1)
  // TODO retry, 而且是必要的
  if (allPagesImagesArray.length !== taskList.length) {
    console.log('有失敗的單一圖片下載!!!!!!')
    console.log('有失敗的單一圖片下載!!!!!!')
    console.log('有失敗的單一圖片下載!!!!!!')
    console.log('有失敗的單一圖片下載!!!!!!')
  }
  allPagesImagesArray = allPagesImagesArray.map(({ data }) => data)

  return [allPagesImagesArray, null]

  function _create_task(list) {
    return list.map(info => {
      const { src, sort, name, type, url, id } = info
      const { directory } = globalVariable.folderMap[id]
      const filePath = `${directory}/${name}.${type}`

      return function () {
        return download(src, filePath, {
          headers: { Cookie: globalVariable.cookie }
        })
      }
    })
  }
}

async function getEachImageInfo(allImageLinkList) {
  const taskList = _create_task(allImageLinkList)

  const taskNumber = 2
  const task_search = new TaskSystem(taskList, taskNumber, defaultTaskSetting(500))

  let allPagesImagesArray = (await task_search.doPromise()).filter(result => result.status === 1)
  // TODO retry, 而且是必要的
  if (allPagesImagesArray.length !== taskList.length) {
    console.log('有失敗的單一圖片頁面!!!!!!')
    console.log('有失敗的單一圖片頁面!!!!!!')
    console.log('有失敗的單一圖片頁面!!!!!!')
    console.log('有失敗的單一圖片頁面!!!!!!')
  }
  allPagesImagesArray = allPagesImagesArray.map(({ data }) => data)

  return [allPagesImagesArray, null]

  function _create_task(list) {
    return list.map(info => {
      const { url } = info

      return function () {
        return new Promise((resolve, reject) => {
          request(createRequestHeader(url), function (error, response, body2) {
            if (error) {
              showError('getImgSrcByLink', 'api errur!')
              return reject(erro)
            }

            $ = cheerio.load(body2)
            const linkObj = { ...info }
            const imageDom = $('#img')

            const src = imageDom.attr('src')
            linkObj.src = src
            linkObj.type = src.match(/\.(\w+)$/)[1]

            return resolve(linkObj)
          })
        })
      }
    })
  }
}

async function getEachPageImagesLink({ endPage, url: rowUrl, id }) {
  stepMessage('getEachPageImagesLink')
  const url = rowUrl.replace(/\?.*$/, '')
  const permissionList = _createEachPageImagesLinkTask(url, endPage)

  const taskNumber = 1
  const task_search = new TaskSystem(permissionList, taskNumber, defaultTaskSetting())

  let allPagesImagesArray = (await task_search.doPromise()).filter(result => result.status === 1)

  // TODO retry, 而且是必要的
  if (allPagesImagesArray.length !== endPage) {
    console.log('有失敗的頁數!!!!!!')
    console.log('有失敗的頁數!!!!!!')
    console.log('有失敗的頁數!!!!!!')
    console.log('有失敗的頁數!!!!!!')
  }

  allPagesImagesArray = allPagesImagesArray
    .map(({ data }) => data)
    .reduce((list, pageInfo) => list.concat(pageInfo), [])

  return [allPagesImagesArray, null]

  function _createEachPageImagesLinkTask(url, endPage) {
    return [...Array(endPage)].map((_, page) => {
      const urlWithPage = `${url}?p=${page}`
      return function () {
        return new Promise((resolve, reject) => {
          request(createRequestHeader(urlWithPage), function (error, response, body) {
            if (error) {
              showError(`get ${urlWithPage}`, 'api request failed')
              return reject(error)
            }

            const $ = cheerio.load(body)
            const list = $('.gdtm a')
            const linkArray = []

            let temp = null
            for (let i = 0; i < list.length; i++) {
              temp = $(list[i]).attr('href')
              linkArray.push({
                id,
                url: temp,
                name: temp.split('/')[5],
                sort: 40 * page + i + 1
              })
            }

            return resolve(linkArray)
          })
        })
      }
    })
  }
}

// 會被遞迴執行?
function getUrlInfo(urlIndex, setting) {
  const { cookie, urlList } = setting
  const currentUrl = urlList[urlIndex]

  if (urlIndex >= urlList.length) return void console.log('COMPLETE >w<//')

  // console.log('your cookie is: ' + jsonContent.cookie);
  stepMessage('Get Url Info')
  console.log(`current fetch url: ${currentUrl}`)

  // TODO check what is this ? startPage = 1
  return new Promise(resolve =>
    request(createRequestHeader(currentUrl), function (error, _, body) {
      if (error) {
        showError('getUrlInfo', 'get url basic info failed!')
        return resolve([null, error])
      }

      const $ = cheerio.load(body)

      const endPage = getEndPage($)
      if (isNaN(endPage)) return void showError('endPage', 'endPage is not a number')

      const title = $('title').text().trim().replace(/ /g, '_')
      const directory = SAVE_DIRECTORY + '/' + title.replace(/\W/g, '_')
      const id = getId(currentUrl)
      globalVariable.folderMap[id] = { directory, endPage, id, title, url: currentUrl }

      if (!fs.existsSync(directory)) fs.mkdirSync(directory)

      console.log('get url info success')
      console.log("gallery's title: " + title)
      console.log(`total page: ${endPage}`)
      console.log(`save in directory: ${directory}`)

      return resolve([{ endPage, directory, id, title, url: currentUrl }, null])
    })
  )
}

console.reset = function () {
  return process.stdout.write('\033c')
}
