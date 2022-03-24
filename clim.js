// TODO
// 1. 當task 發生 error 的時候要把那些 error 抓出來 retry
// -> 這個功能看如果可以的話要寫進 TaskSystem 裡面?
// 2. 撰寫階段性的下載機制: 像是直接匯入已經進到某些頁面的網址之類的
// 雖然這樣說但 p=0 之類的其實沒有什麼區別..
// 再看看要用參數之類的去處理這件事情
// 3. 避免使用 request, 他已經被拋棄了, 要注意也要有 request 的 headers 功能

const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')

const { TaskSystem, download } = require('npm-flyc')
const defaultTaskSetting = (randomDelay = 0) => ({ randomDelay })

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
  stepMessage('完成囉!!!!')

  // TODO 遞迴檢查 getUrlInfo 的其他項目?
}

async function startDownload(list) {
  const taskList = _create_task(list)
  const taskNumber = 2
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
      const { src, sort, name, type, id } = info
      const { directory } = globalVariable.folderMap[id]
      const filePath = `${directory}/${sort}-${name}.${type}`

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
              return reject(error)
            }

            const $ = cheerio.load(body2)
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

  const taskNumber = 2
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
  const { urlList } = setting
  const currentUrl = urlList[urlIndex]

  if (urlIndex >= urlList.length) return void console.log('COMPLETE >w<//')

  stepMessage('Get Url Info')
  console.log(`current fetch url: ${currentUrl}`)

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

console.reset = process.stdout.write('\0') // process.stdout.write('\033c')
