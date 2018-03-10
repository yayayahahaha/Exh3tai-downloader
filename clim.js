var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');

var result = [],
    save_directory = './saveImg',

    linkArray = [],
    srcArray = [],

    countloaded = 0,

    currentDirectory = '',

    startPage = 1,
    endPage = null,

    $ = null,
    urlIndex = 0,

    pagerSelector = 'table.ptt td',

    url = '{put your url value in key url of setting.json }',
    cookie = '{put your cookie value in key cookie of setting.json }';

console.log('***************');
console.log('Download Start!');
console.log('***************');
if (!fs.existsSync(save_directory)) {
    fs.mkdirSync(save_directory);
}
loadSetting(urlIndex);

function loadSetting() {
    console.log('Load setting info:');
    var content = fs.readFileSync("setting.json"),
        jsonContent = JSON.parse(content);
    if (jsonContent.cookie && jsonContent.url) {
        if (urlIndex >= jsonContent.url.length) {
            console.log('all url links downloaded!');
            console.log('complete!');
            return;
        }

        // console.log('your cookie is: ' + jsonContent.cookie);
        console.log('Your url is: ' + JSON.stringify(jsonContent.url[urlIndex]));

        cookie = jsonContent.cookie;
        url = jsonContent.url[urlIndex];
        startPage = 1;

        request({
            url: url,
            headers: {
                Cookie: cookie
            },
            jar: true
        }, function(error, response, body) {
            if (!error) {
                $ = cheerio.load(body);

                var pager = $(pagerSelector);
                endPage = $(pager[pager.length - 2]).text();
                endPage = parseInt(endPage, 10);

                var title = $('title').text();
                title = title.trim().replace(/ /g, '_');
                console.log('gallery\'s title: ' + title);

                currentDirectory = save_directory + '/' + title;
                console.log('save in directory: ' + currentDirectory);
                if (!fs.existsSync(currentDirectory)) {
                    fs.mkdirSync(currentDirectory);
                }

                for (var i = 0; i < endPage; i++) {
                    getPageImagesLink(i);
                }

            } else {
                console.log(error);
            }
        });

    } else {
        console.log('setting.json parse error!');
        return;
    }
}

function getPageImagesLink(startPage) {
    fs.writeFile('result.json', '', function() {
        // console.log('reset result.json done');
    });

    request({
        url: url + '?p=' + startPage,
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body) {

        console.log('current url: ' + url + '?p=' + startPage);

        if (!error) {
            $ = cheerio.load(body);

            var pager = $(pagerSelector);
            endPage = $(pager[pager.length - 2]).text();
            endPage = parseInt(endPage, 10);

            var title = $('title').text();
            title = title.trim().replace(/ /g, '_');

            currentDirectory = save_directory + '/' + title;
            if (!fs.existsSync(currentDirectory)) {
                fs.mkdirSync(currentDirectory);
            }

            var list = $('.gdtm a');
            console.log('current page\'s images number: ' + list.length);
            for (var i = 0; i < list.length; i++) {
                tmp = $(list[i]).attr('href');
                linkArray.push({
                    url: tmp,
                    name: tmp.split('/')[5],
                    number: 40 * startPage + i + 1
                });
            }
            singlePageLoaded(endPage);
        } else {
            console.log('getPageImagesLink error! retry.' + error);
            getPageImagesLink(startPage);
        }
    });
}

function singlePageLoaded(totalNumber) {
    countloaded++;
    if (countloaded == totalNumber) {
        countloaded = 0;
        console.reset();
        console.log('100%');

        linkArray.sort(function(a, b) {
            return a.number - b.number;
        });

        // for (var i = 0; i < linkArray.length; i++) {
        for (var i = 0; i < 10; i++) {
            var singlePageObj = linkArray[i];
            getImgSrcByLink(singlePageObj, 10);
            // getImgSrcByLink(singlePageObj, linkArray.length);
        }

    } else {
        console.reset();
        console.log((countloaded * 100 / totalNumber).toFixed(2) + '%');
    }
}

function getImgSrcByLink(linkObj, totalNumber) {
    request({
        url: linkObj.url,
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body2) {

        console.log('current url: ' + linkObj.url);

        if (!error) {
            $ = cheerio.load(body2);
            var imgList = $('#img');

            linkObj.src = imgList.attr('src');
            linkObj.type = imgList.attr('src').split('.')[imgList.attr('src').split('.').length - 1];
            srcArray.push(linkObj);

            loadedFunction(totalNumber);
        } else {
            console.log('getImgSrcByLink error! retry.' + error);
            loadedFunction(totalNumber);
            // getImgSrcByLink(linkObj, totalNumber);
        }
    });
}

function loadedFunction(totalNumber) {
    console.log(totalNumber);
    countloaded++;
    if (countloaded == totalNumber) {
        countloaded = 0;
        // result = srcArray.slice();

        console.log(srcArray);
        console.log(srcArray.length);

        return;

        startPage++;
        if (startPage <= endPage) {
            begin(startPage);
        } else {
            console.log(startPage, endPage);
            console.log('Get all links done, now start download');
            downloadTrigger();
        }
    } else {
        console.log((countloaded * 100 / totalNumber).toFixed(2) + '%');
    }
}

function returnCookie() {
    return cookie;
}

function downloadTrigger() {
    console.log('load result.json');
    var jsonContent = result,
        temp = {};

    for (var i = 0; i < jsonContent.length; i++) {
        var obj = jsonContent[i];
        if (temp[obj.src]) {
            continue;
        } else {
            temp[obj.src] = {
                src: obj.src,
                name: obj.name,
                number: obj.number,
                type: obj.type
            };
        }
    }
    inputLength = Object.keys(temp).length;
    for (var key in temp) {
        download(key, currentDirectory, temp[key].name + '.' + temp[key].type);
    }
}

function download(url, dir, filename) {
    if (!url || !dir || !filename) {
        console.log('download parameter lost!');
        return;
    }
    request(url, function(er, res, body) {
        if (!er) {
            countloaded++;
            if (countloaded == inputLength) {
                console.log('done!');
                urlIndex++;
                srcArray = []; //hope this time is correct!
                loadSetting(urlIndex);
            } else {
                console.log(inputLength, countloaded);
                // console.log(countloaded * eachPersent + '%');
            }
        } else {
            console.log('download failed! retry.');
            console.log(er);
            download(url, dir, filename);
        }

    }).pipe(fs.createWriteStream(dir + '/' + filename));
}

console.reset = function() {
    return process.stdout.write('\033c');
}

/*
temp = [];
[].forEach.call(document.querySelectorAll('.id3 a'), function(item){
    temp.push(item.href)
})
console.log(JSON.stringify(temp))
*/