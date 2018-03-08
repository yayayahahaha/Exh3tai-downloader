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

    startPage = 1,
    endPage = null,
    $ = null,
    pagerSelector = 'div.gtb>table.ptt>tbody>tr td',

    url = '{put your url value in key url of setting.json }',
    cookie = '{put your cookie value in key cookie of setting.json }';

loadSetting();

function loadSetting() {
    console.log('load setting info:');
    var content = fs.readFileSync("setting.json"),
        jsonContent = JSON.parse(content);
    if (jsonContent.cookie && jsonContent.url) {
        // console.log('your cookie is: ' + jsonContent.cookie);
        console.log('your url is: ' + JSON.stringify(jsonContent.url));
        cookie = jsonContent.cookie;
        url = jsonContent.url[0];

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
            var pager = $(pagerSelector);
            endPage = pager.length - 2;

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
        console.log('=====================================');
        console.log('Start download');
        console.log('=====================================');
        countloaded = 0;
        fs.writeFileSync('result.json', JSON.stringify(srcArray));

        startPage++;
        if (startPage <= endPage) {
            begin(startPage);
        } else {
            console.log(startPage, endPage);
            console.log('Get all links done, now start download');
            downloadTrigger();
        }
        return;

        [].forEach.call(srcArray, function(item, index) {
            var temp = item.src.split('.');
            type = temp[temp.length - 1];

            download(item.src, save_directory, item.name + '.' + type);
        });
    } else {
        console.log(countloaded * eachPersent + '%');
    }
}

function returnCookie() {
    return cookie;
}

function downloadTrigger() {
    console.log('load result.json');
    var content = fs.readFileSync("result.json"),
        jsonContent = JSON.parse(content),
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
        download(key, save_directory, temp[key].name + '.png');
    }
}

function download(url, dir, filename) {
    filename = filename ? filename : dir + totalCount;
    request.head(url, function(err, res, body) {
        if (!err) {
            request(url, function(er, res, body) {
                countloaded++;
                if (countloaded == inputLength) {
                    console.log('done!');
                    console.log('complete!');
                } else {
                    console.log(inputLength, countloaded);
                    // console.log(countloaded * eachPersent + '%');
                }
            }).pipe(fs.createWriteStream(dir + '/' + filename));
        } else {
            console.log('download failed! retry.');
            console.log(err);
            // download(url, dir, filename);
        }
    });
}