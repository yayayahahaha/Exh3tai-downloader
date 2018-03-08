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
    fs.writeFile('result.json', '', function(){console.log('reset result.json done')})

    countloaded = 0;
    console.log('request Begin! now at page: ' + startPage);

    request({
        url: url + '?p=' + toString(parseInt(startPage, 0) - 1),
        headers: {
            Cookie: cookie
        },
        jar: true
    }, function(error, response, body) {
        if (!error) {
            $ = cheerio.load(body);
            eachImgPageArray = [];
            nameArray = [];
            var pager = $(pagerSelector);
            endPage = pager.length - 2;
            console.log(endPage);

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
                number: number,
                src: imgList.attr('src'),
                name: input.name
            });
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

        startPage++;
        if (startPage <= endPage) {
            begin(startPage);
        } else {
            console.log(startPage, endPage);
        }

        [].forEach.call(srcArray, function(item, index) {
            try {
                var temp = item.src.split('.');
                type = temp[temp.length - 1];
            } catch(e) {
            console.log(item.src)    
            }
            
            return;
            download(item.src, save_directory, item.name + '.' + type);
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