var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');

var result = [],
    photo_id = [],
    single_id = [],
    multi_id = [],
    single_src = [],
    final_src = [],
    save_directory = './saveImg',
    totalCount = 0,

    total_photo_number = 0,
    srcArray = [],

    countloaded = 0,

    currentDirectory = '',

    startPage = 1,
    endPage = null,
    $ = null,
    urlIndex = 0,
    pagerSelector = 'div.gtb>table.ptt>tbody>tr td',

    url = '{put your url value in key url of setting.json }',
    cookie = '{put your cookie value in key cookie of setting.json }';

loadSetting(urlIndex);

function loadSetting() {
    console.log('load setting info:');
    var content = fs.readFileSync("setting.json"),
        jsonContent = JSON.parse(content);
    if (jsonContent.cookie && jsonContent.url) {
        if (urlIndex >= jsonContent.url.length) {
            console.log('all url links downloaded!');
            console.log('complete!');
            return;
        }

        // console.log('your cookie is: ' + jsonContent.cookie);
        console.log('your url is: ' + JSON.stringify(jsonContent.url[urlIndex]));
        cookie = jsonContent.cookie;
        url = jsonContent.url[urlIndex];
        startPage = 1;

        begin(startPage);
    } else {
        return;
    }
}

function begin(startPage) {
    fs.writeFile('result.json', '', function() {
        console.log('reset result.json done')
    });
    if (!fs.existsSync(save_directory)) {
        fs.mkdirSync(save_directory);
    }

    countloaded = 0;
    console.log('request Begin! now at page: ' + startPage);

    request({
        url: url + '?p=' + (parseInt(startPage, 10) - 1).toString(),
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body) {

        console.log(url + '?p=' + (parseInt(startPage, 10) - 1).toString());

        if (!error) {
            $ = cheerio.load(body);
            eachImgPageArray = [];
            nameArray = [];
            srcArray = [];
            var pager = $(pagerSelector);
            endPage = pager.length - 2;
            console.log('endPage: ' + endPage);

            var title = $('h1#gj').text();
            title = title.trim().replace(/ /g, '_');
            console.log(title);
            currentDirectory = save_directory + '/' + title;
            console.log(currentDirectory);
            if (!fs.existsSync(currentDirectory)) {
                fs.mkdirSync(currentDirectory);
            }

            var list = $('.gdtm a');
            console.log(list.length);
            for (var i = 0; i < list.length; i++) {
                tmp = $(list[i]).attr('href');
                eachImgPageArray.push({
                    url: tmp,
                    name: tmp.split('/')[5]
                });
                console.log(eachImgPageArray[i].name);
            }

            inputLength = eachImgPageArray.length;
            if (inputLength < 40) {
                endPage = -1;
            }
            eachPersent = 100 / inputLength;

            for (i = 0; i < eachImgPageArray.length; i++) {
                step2(eachImgPageArray[i], i);
            }

        } else {
            console.log(error);
        }
    });
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
                number: obj.number
            };
        }
    }
    inputLength = Object.keys(temp).length;
    for (var key in temp) {
        download(key, currentDirectory, temp[key].name + '.png');
    }
}

function download(url, dir, filename) {
    filename = filename ? filename : dir + totalCount;
    request.head(url, function(err, res, body) {
        if (!err) {
            request(url, function(er, res, body) {
                if (!er) {
                    countloaded++;
                    if (countloaded == inputLength) {
                        console.log('done!');
                        urlIndex++;
                        loadSetting(urlIndex);
                    } else {
                        console.log(inputLength, countloaded);
                        // console.log(countloaded * eachPersent + '%');
                    }
                } else {
                    console.log('download failed inside! retry.');
                    download(url, dir, filename);
                }

            }).pipe(fs.createWriteStream(dir + '/' + filename));
        } else {
            console.log('download failed! retry.');
            console.log(url);
            download(url, dir, filename);
        }
    });
}

/*
temp = [];
[].forEach.call(document.querySelectorAll('.id3 a'), function(item){
    temp.push(item.href)
})
console.log(JSON.stringify(temp))
*/