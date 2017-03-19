
"use strict";
var page = require('webpage').create();
var system = require('system');

var fs = require('fs');
var htmls = [];
var pdfs =  [];
var index = 0;
var pindex = 0;
var base_source = "/home/yashpal/Projects/Treasure/htmls/"
var base_destination = "/home/yashpal/Projects/pdfs/"

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
            // t1 = htmlfile.split('/')
            // t1.pop
            // job_id = t1.pop
            // update_status(job_id,"finished")
            daemon();
        } else {
            index++;
            printPdf(htmls[index], pdfs[index]);
        }

    });
}

var getFileList = function() {
    pindex++;
    console.log("PIndex: "+ pindex);
    var htmls = new Array();
    var pdfs = new Array();
    var basepath = "/home/yashpal/Projects/Treasure/phantomjs/test"
    var curdir = fs.list(basepath);
    var workingDirectory = null
    for (var i = 0; i < curdir.length; i++) {
        var fullpath = basepath + curdir[i];
        if(fs.isDirectory(fullpath)) {
            workingDirectory = fullpath;
            break; 
        }
    }

    if (workingDirectory != null) {
        curdir = fs.list(workingDirectory);
        for (var i = 0; i < curdir.length; i++) {
            var fullpath = fs.workingDirectory + fs.separator + curdir[i];
            if (fs.isFile(fullpath)) {
                if (fullpath.indexOf('.html') != -1) {
                    htmls.push(fullpath);
                    pdfs.push(fullpath.replace('.html', '.pdf'))
                }
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
        setTimeout(daemon, 5000);
    }
}

var update_status = function(job_id, status) {
    var updatepage = require('webpage').create(),
    server = 'http://localhost:3002/print/status',
    data = 'status='+status+'job_id='+job_id;
    updatepage.open(server, 'post', data, function (status) {
        if (status !== 'success') {
            console.log('Unable to post!');
        } else {
            console.log(page.content);
        }
    });
}

daemon();

// give a source directory and destination directory
// phantomjs processes source and put everything into destination
