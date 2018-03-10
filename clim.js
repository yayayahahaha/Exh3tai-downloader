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

    countloaded = 0;
    console.log('Now at page ' + (startPage + 1));

    // return;

    request({
        url: url + '?p=' + startPage,
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body) {

        console.log('current url: ' + url + '?p=' + (parseInt(startPage, 10) - 1).toString());

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

            var list = $('.gdtm a');
            console.log('current page\'s images number: ' + list.length);
            for (var i = 0; i < list.length; i++) {
                tmp = $(list[i]).attr('href');
                linkArray.push({
                    url: tmp,
                    name: tmp.split('/')[5]
                });
                // console.log(linkArray[i].name);
            }
        } else {
            console.log('getPageImagesLink error! retry.' + error);
            getPageImagesLink(startPage);
        }
    });
}

ccc = 0;
function counter(number) {
    console.log(number);
    ccc++;
    if (ccc == endPage) {
        console.log(linkArray);
    }
}

function step2(input, number) {
    request({
        url: input.url,
        headers: {
            Cookie: returnCookie()
        },
        jay: true
    }, function(er, res, body2) {
        if (!er) {
            $ = cheerio.load(body2);
            var imgList = $('#img');

            srcArray.push({
                number: (parseInt(startPage) - 1) * 40 + parseInt(number),
                src: imgList.attr('src'),
                name: number + input.name,
                type: imgList.attr('src').split('.')[imgList.attr('src').split('.').length - 1]
            });
            loadedFunction();
        } else {
            console.log('error! retry~!');
            step2(input, number);
        }
    });
}

function loadedFunction() {
    countloaded++;
    if (countloaded == inputLength) {
        console.log(countloaded * eachPersent + '%');
        countloaded = 0;
        result = null;
        result = srcArray.slice();

        startPage++;
        if (startPage <= endPage) {
            begin(startPage);
        } else {
            console.log(startPage, endPage);
            console.log('Get all links done, now start download');
            downloadTrigger();
        }
    } else {
        console.log(countloaded * eachPersent + '%');
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

/*
temp = [];
[].forEach.call(document.querySelectorAll('.id3 a'), function(item){
    temp.push(item.href)
})
console.log(JSON.stringify(temp))
*/