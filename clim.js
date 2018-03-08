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

    startPage = 1,
    endPage = 7,
    $ = null,
    url = '{put your lovely gallery url here}',
    cookie = '{put your cookie here}';

begin(startPage);

function begin(startPage) {

    console.log('load setting info:');
    var content = fs.readFileSync("setting.json");
    return;

    countloaded = 0;
    console.log('request Begin! now at page: ' + startPage);

    request({
        url: url + '?p=' + startPage,
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body) {
        if (!error) {
            $ = cheerio.load(body);
            eachImgPageArray = [];
            nameArray = [];
            var list = $('.gdtm div a');
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

            for (var i = 0; i < eachImgPageArray.length; i++) {
                step2(eachImgPageArray[i], i);
            }

        } else {
            console.log('error occur!');
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

            srcArray.push([imgList.attr('src'), input.name]);
            loadedFunction();
        } else {
            console.log('error! retry~!');
            step2(input, number);
        }
    });
}

countloaded = 0;

function loadedFunction() {
    countloaded++;
    if (countloaded == inputLength) {
        console.log(countloaded * eachPersent + '%');
        console.log('=====================================');
        console.log('Start download');
        console.log('=====================================');
        countloaded = 0;
        fs.writeFileSync('result.json', JSON.stringify(srcArray));
        return;
        [].forEach.call(srcArray, function(item, index) {
            type = src[0][src[0].length - 3] + src[0][src[0].length - 2] + src[0][src[0].length - 1];
            download(src[0], save_directory, src[1] + '.' + type);
        });
    } else {
        console.log(countloaded * eachPersent + '%');
    }
}

function returnCookie() {
    return cookie;
}

function download(url, dir, filename) {
    filename = filename ? filename : dir + totalCount;
    request.head(url, function(err, res, body) {
        if (!err) {
            request(url, function(er, res, body) {
                countloaded++;
                if (countloaded == inputLength) {
                    console.log('done!');
                    startPage++;
                    if (startPage <= endPage) {
                        begin(startPage);
                    } else {
                        console.log(startPage, endPage);
                    }
                } else {
                    console.log(countloaded * eachPersent + '%');
                }
            }).pipe(fs.createWriteStream(dir + '/' + filename));
        } else {
            countloaded++;
        }
    });
}