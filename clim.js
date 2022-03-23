const request = require('request')
const fs = require('fs')
const cheerio = require('cheerio')
const { head } = require('request')
const { getHeapCodeStatistics } = require('v8')
const { resolve } = require('dns')

const { TaskSystem, download } = require('npm-flyc')
const { end } = require('cheerio/lib/api/traversing')
const defaultTaskSetting = () => ({ randomDelay: 0 })

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
  const [eachPageList, eachPageError] = await getEachPageImagesLink({ url, endPage, id })
  if (eachPageError) return // TODO error check

  console.log(eachPageList)
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
                url: temp,
                name: temp.split('/')[5],
                number: 40 * page + i + 1
              })
            }

            return resolve(linkArray)
          })
        })
      }
    })
  }
}

function singlePageLoaded(totalNumber) {
  countloaded++
  if (countloaded == totalNumber) {
    countloaded = 0
    console.reset()
    console.log('100%')

    linkArray.sort(function (a, b) {
      return a.number - b.number
    })

    taskIndex = taskIndex < linkArray.length ? taskIndex : linkArray.length - 1
    for (var i = 0; i <= taskIndex; i++) {
      getImgSrcByLink(linkArray[i])
    }
  } else {
    console.reset()
    console.log(((countloaded * 100) / totalNumber).toFixed(2) + '%')
  }
}

function getImgSrcByLink(linkObj, totalNumber) {
  request(
    {
      url: linkObj.url,
      headers: {
        Cookie: cookie
      },
      jar: true
    },
    function (error, response, body2) {
      console.log('current url: ' + linkObj.url)
      if (!error) {
        $ = cheerio.load(body2)
        var imgList = $('#img')

        linkObj.src = imgList.attr('src')
        linkObj.type = imgList.attr('src').split('.')[imgList.attr('src').split('.').length - 1]
        srcArray.push(linkObj)

        taskIndex++
        if (taskIndex >= linkArray.length) {
          if (srcArray.length === linkArray.length) {
            console.log('get src complete! start download')

            fs.writeFile(currentDirectory + '.json', JSON.stringify(srcArray), function () {
              console.log('write download src into result.json for testing')
              srcArray = []
              linkArray = []
              taskIndex = originTaskIndex
              urlIndex++
              getUrlInfo(urlIndex)
            })
            downloadTrigger()
            return
          }
          console.reset()
          console.log(taskIndex, linkArray.length, srcArray.length)
        } else {
          console.reset()
          console.log(taskIndex, linkArray.length, srcArray.length)
          getImgSrcByLink(linkArray[taskIndex])
        }
      } else {
        console.log('getImgSrcByLink error! retry.' + error)
        getImgSrcByLink(linkObj, totalNumber)
      }
    }
  )
}

function downloadTrigger() {
  countloaded = 0
  taskIndex = originTaskIndex <= srcArray.length ? originTaskIndex : srcArray.length
  for (var i = 0; i <= taskIndex; i++) {
    if (!srcArray[i]) continue
    download(srcArray[i].src, currentDirectory, srcArray[i].name + '.' + srcArray[i].type)
  }
}

console.reset = function () {
  return process.stdout.write('\033c')
}
