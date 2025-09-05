import fetch from 'node-fetch'

import { readSettingInfo, checkParam, stepMessage } from './utils.js'
import { lightCyan, lightGreen, lightRed } from './console-color.js'

start
async function start() {
  console.log("Let's Go!")

  stepMessage('Load setting.json')
  const jsonContent = readSettingInfo()
  if (jsonContent == null) return
  if (!checkParam(jsonContent)) return

  const { cookie, url: urlList } = jsonContent

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i]
    await addToFavorite(url, cookie)
    console.log(`url ${url} 添加成功`)
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('成功')
}

export class ErrorRes {
  constructor(type, error) {
    this.type = type
    this.error = error
  }

  static TYPE_INFO_MAP = {
    FAVORITE: { logError: (url, error) => console.log(lightRed(`添加 ${url} 到 favorite  失敗`), error) },
    NORMALIZED_URL: {},
    COOKIES_MISSING: {},
    WRONG_URL: {},
    BASIC_INFO_FAILED: {},
    PAGE_NUMBER_FAILED: {},
    PAGE_INFO_FAILED: {},
    IMAGE_SRC_NOT_EXIST: {},
    IMAGEDOWN_LOAD_FAILED: {},
  }

  static TYPE_MAP = {
    FAVORITE: 'FAVORITE',
    NORMALIZED_URL: 'NORMALIZED_URL',
    COOKIES_MISSING: 'COOKIES_MISSING',
    WRONG_URL: 'WRONG_URL',
    BASIC_INFO_FAILED: 'BASIC_INFO_FAILED',
    PAGE_NUMBER_FAILED: 'PAGE_NUMBER_FAILED',
    PAGE_INFO_FAILED: 'PAGE_INFO_FAILED',
    IMAGE_SRC_NOT_EXIST: 'IMAGE_SRC_NOT_EXIST',
    IMAGEDOWN_LOAD_FAILED: 'IMAGEDOWN_LOAD_FAILED',
  }
}

export async function addToFavorite(url, cookie) {
  console.log(lightCyan(`開始添加到 ${url} 到 favorite`))

  const { pathname } = new URL(url)
  const [, , gid, t] = pathname.split('/')

  const queryString = new URLSearchParams({
    act: 'addfav',
    gid,
    t,
  }).toString()
  const headers = createFavorateHeader(url, cookie)
  const finalHeader = { ...headers }

  const apiUrl = `https://exhentai.org/gallerypopups.php?${queryString}`
  return fetch(apiUrl, {
    headers: finalHeader,
    body: 'favcat=0&favnote=&apply=Apply+Changes&update=1',
    method: 'POST',
  })
    .then(() => console.log(lightGreen(`📒 ${url} favorite 添加成功`)))
    .catch((error) => {
      throw new ErrorRes(ErrorRes.TYPE_MAP.FAVORITE, error)
    })
}

function createFavorateHeader(url, cookie) {
  const { pathname } = new URL(url)
  const [, , gid, t] = pathname.split('/')

  const queryObject = {
    act: 'addfav',
    gid,
    t,
  }

  return {
    cookie,
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-TW,zh;q=0.9',
    'cache-control': 'max-age=0',
    'content-type': 'application/x-www-form-urlencoded',
    priority: 'u=0, i',
    'upgrade-insecure-requests': '1',
    Referer: `https://exhentai.org/gallerypopups.php?${new URLSearchParams(queryObject).toString()}`,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}
