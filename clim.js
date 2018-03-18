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

    originTaskIndex = 16,
    taskIndex = 16,

    pagerSelector = 'table.ptt td',

    linkChunkArray = [],
    chunkIndex = 0,
    chunkNumber = 10,

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
                try {
                    if (!fs.existsSync(currentDirectory)) {
                        fs.mkdirSync(currentDirectory);
                    }
                } catch (e) {
                    currentDirectory = save_directory + '/' + title.replace(/\W/g, '_');
                    if (!fs.existsSync(currentDirectory)) {
                        fs.mkdirSync(currentDirectory);
                    }
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

        // console.log('current url: ' + url + '?p=' + startPage);

        if (!error) {
            $ = cheerio.load(body);

            var pager = $(pagerSelector);
            endPage = $(pager[pager.length - 2]).text();
            endPage = parseInt(endPage, 10);

            var title = $('title').text();
            title = title.trim().replace(/ /g, '_');

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

        taskIndex = taskIndex < linkArray.length ? taskIndex : linkArray.length - 1;
        for (var i = 0; i <= taskIndex; i++) {
            getImgSrcByLink(linkArray[i]);
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

            taskIndex++;
            if (taskIndex >= linkArray.length) {
                if (srcArray.length === linkArray.length) {
                    console.log('get src complete! start download');
                    fs.writeFile(currentDirectory + '.json', JSON.stringify(srcArray), function() {
                        console.log('write download src into result.json for testing');
                        srcArray = [];
                        linkArray = [];
                        taskIndex = originTaskIndex;
                        urlIndex++;
                        loadSetting(urlIndex);
                    });
                    return;
                    downloadTrigger();
                    return;
                }
                console.reset();
                console.log(taskIndex, linkArray.length, srcArray.length);
            } else {
                console.reset();
                console.log(taskIndex, linkArray.length, srcArray.length);
                getImgSrcByLink(linkArray[taskIndex]);
            }
        } else {
            console.log('getImgSrcByLink error! retry.' + error);
            getImgSrcByLink(linkObj, totalNumber);
        }
    });
}

function returnCookie() {
    return cookie;
}

function downloadTrigger() {
    countloaded = 0;
    taskIndex = originTaskIndex <= srcArray.length ? originTaskIndex : srcArray.length;
    for (var i = 0; i <= taskIndex; i++) {
        download(srcArray[i].src, currentDirectory, srcArray[i].name + '.' + srcArray[i].type);
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
            taskIndex++;
            if (taskIndex >= srcArray.length) {
                if (countloaded >= srcArray.length) {
                    console.log('done!');
                    urlIndex++;
                    srcArray = []; //hope this time is correct!
                }
                console.log(countloaded, linkArray.length, taskIndex, (countloaded * 100 / linkArray.length).toFixed(2) + '%');
            } else {
                console.log(countloaded, linkArray.length, taskIndex, (countloaded * 100 / linkArray.length).toFixed(2) + '%');
                download(srcArray[taskIndex], currentDirectory, srcArray[taskIndex].name + '.' + srcArray[taskIndex].type);
            }
        } else {
            console.log('download failed! retry after 1 sec');
            console.log(er);
            setTimeout(function() {
                download(url, dir, filename);
            }, 1000);
        }

    }).pipe(fs.createWriteStream(dir + '/' + filename));
}

console.reset = function() {
    return process.stdout.write('\033c');
};

/*
temp = [];
[].forEach.call(document.querySelectorAll('.id3 a'), function(item){
    temp.push(item.href)
})
console.log(JSON.stringify(temp))
*/