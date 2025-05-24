import fetch from 'node-fetch'

import { readSettingInfo, checkParam, stepMessage } from './utils.js'

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

export async function addToFavorite(url, cookie) {
  console.log(`正要添加到 favorite 的 url: ${url}`)

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
