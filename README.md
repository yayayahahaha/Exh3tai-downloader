# Exh3tai-downloader 傷心熊貓下載器 Sad Panda

> you know, me know, we a11 know

| ENV  | Version |
| ---- | ------- |
| Node | ^14     |

1. install pnpm and pnpm install.

```
npm install -g pnpm
pnpm install
```

2. login your login your Exh3nta1

3. open devtools, then goto `console` panel

> press `F12` to open devtools, more detail [here][console-info]

4. type `document.cookie` to console panel then press `enter`

5. copy whole text

6. rename `"setting.json.default"` into `"setting.json"`

7. follow the words in `setting.json`, paste your copy stuff into cookie part like this:

```
{
  "cookie":"example=example2; example3=example3...",
  ...
}
```

8. copy your lovely gallery url

9. paste it in `setting.json` like thie:

```
{
  "cookie":"example=example2; example3=example3...",
  "url":["https://exh3nta1.org/g/111/11"]
}
```

10. if you want get multiple lovely gallery once, paste it like this:

```
{
  "cookie":"example=example2; example3=example3...",
  "url":[
    "https://exh3nta1.org/g/111/111",
    "https://exh3nta1.org/g/222/222",
    "https://exh3nta1.org/g/333/333"
  ]
}
```

the download will start one by one, please be patient ☕️

> remember the `"` before and after url, and don't forget `,` between each url, and also don't forget`[]` before and after them

11. run `node clim.js`

```
node clim.js
```

12. Enjoy ❤️

### Further, if you want to get all galleries' url once in some search page:

1. open devtools, then goto `console` panel

> press `F12` to open devtools, more detail [here][console-info]

2. type this

```
JSON.stringify([...document.querySelectorAll('.gl1t .gl3t a')].map(dom => dom.href))
```

3. copy them, notice you have to include `[]` before and after the words

4. follow previous step `9` above, notice the format

5. Enjoy ❤️

[console-info]: https://developer.chrome.com/docs/devtools/console/
