# Exh3tai-downloader
you know, me know, we al know

here is the step:

0. install Node.js then run ```npm install``` in your terminal
1. login your Exh3nta1
2. press F12, open the console panel
3. type ```document.cookie```
4. copy whole text
5. rename ```"setting.json.default"``` into ```"setting.json"```
6. follow the words in ```setting.json```, paste your copy stuff into cookie part like this:
```
{
  "cookie":"example=example2; example3=example3...",
  ...
}
```
7. copy your lovely gallery url
8. paste it in ```setting.json``` like thie:
```
{
  "cookie":"example=example2; example3=example3...",
  "url":["https://exh3nta1.org/111/111/11"]
}
```
9. if you want get multiple lovely gallery once, paste it like this:
```
{
  "cookie":"example=example2; example3=example3...",
  "url":["https://exh3nta1.org/111/111/11","https://exh3nta1.org/222/222/222","https://exh3nta1.org/333/333/33"]
}
```
remember the ```"``` before and after url, and don't forget ```,``` between each url, and also don't forget```[]``` before and after them
10. in your terminal, run ```node clim.js```
11. enjoy

Otherwise, if you want to get all galleries' url once in some search page: 
1. press F12, click console panel
2. type this:
```
temp = [];
[].forEach.call(document.querySelectorAll('.id3 a'), function(item){
    temp.push(item.href)
})
console.log(JSON.stringify(temp))
```
3. copy them, notice you have to include ```[]``` before and after the words
4. follow step ```9``` above, notice the format
5. enjoy
