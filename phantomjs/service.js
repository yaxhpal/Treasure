var page = require('webpage').create();
var fs = require('fs');
var htmls = [];
var pdfs =  [];
var index = 0;

var capture = function(page, url, callback) {
    page.open(url, function(status) {
        var interval, allDone;
        interval = setInterval(function() {
            var allDone = page.evaluate(function() { return window.chartReady; });
            if (allDone) {
                clearInterval(interval);
                callback();
            }
        }, 100);
    });
};

var getPage = function() {

    if (page !=null && page.zoomFactor == 4) {
        return page;
    }

    page.paperSize = {
        format: 'A4',
        orientation: 'portrait',
        margin: {
            top: '10px',
            right: '25px',
            bottom: '10px',
            left: '25px'
        },
        footer: {
            height: "30px",
            contents: phantom.callback(function(pageNum, numPages) {
                var footer_style = "border-top: .1em solid #000; padding-top: 5px; width:100%;font-size: 10px;text-align: center;";
                var footer_text = "www.avanti.in";
                return "<div style='" + footer_style + "'>" + footer_text + "<span style='float:right;'>Page - " + pageNum + " / " + numPages + "</span></div>";
            })
        }
    };

    page.settings.dpi = 300
    page.viewportSize = {
        height: 800,
        width: 2200
    }

    page.zoomFactor = 4;

    return page;
}

var printPdf = function(htmlfile, pdffile) {

    var pageUrl = 'file://' + htmlfile;

    page = getPage();

    capture(page, pageUrl, function(err) {
        if (err) {
            console.log(err);
        } else {
            page.render(pdffile, {
                format: 'pdf'
            });
        }

        fs.remove(htmlfile);

        if (index == htmls.length - 1) {
            daemon();
        } else {
            index++;
            printPdf(htmls[index], pdfs[index]);
        }

    });
}

var getFileList = function() {
    htmls = new Array();
    pdfs = new Array();
    var curdir = fs.list(fs.workingDirectory);
    for (var i = 0; i < curdir.length; i++) {
        var fullpath = fs.workingDirectory + fs.separator + curdir[i];
        if (fs.isFile(fullpath)) {
            if (fullpath.indexOf('.html') != -1) {
                htmls.push(fullpath);
                pdfs.push(fullpath.replace('.html', '.pdf'))
            }
        }
    }
    console.log('Number of Html Files: ' + htmls);
}

var daemon = function() {
    getFileList();
    if (htmls.length > 0) {
        console.log("Printing pdfs....");
        index = 0;
        printPdf(htmls[index], pdfs[index]);
    } else {
        console.log("Continue daemon....");
        setInterval(daemon, 3000);
    }
}


daemon();