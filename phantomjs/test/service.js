
"use strict";
var page = require('webpage').create();
var system = require('system');
var fs = require('fs');

// Global variables
var htmls = [];
var pdfs =  [];
var index = 0;
var pindex = 0;
var job_id = null;
var base_source = "/home/yashpal/Projects/Treasure/phantomjs/htmls/"
var base_destination = "/home/yashpal/Projects/avanti-lms/tmp/print/"


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
        console.log("printing:  " + htmlfile);
        if (index == htmls.length - 1) {
            console.log("Job Id: " + job_id);
            console.log(base_source+job_id+'/');
            console.log(base_destination+job_id+'/');
            fs.copyTree(base_source+job_id+'/', base_destination+job_id+'/');
            fs.removeTree(base_source+'/'+job_id);
            update_status(job_id, "finished")
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
    htmls = [];
    pdfs = [];
    var basepath = base_source
    console.log("base: " + basepath);
    var curdir = fs.list(basepath).slice(2);
    console.log("all files:" + curdir);
    var workingDirectory = null
    for (var i = 0; i < curdir.length; i++) {
        var fullpath = basepath + curdir[i];
        console.log("full path: " + fullpath)
        if(fs.isDirectory(fullpath)) {
            console.log("Directory: " + fullpath)
            workingDirectory = fullpath;
            console.log("Working in" + workingDirectory);
            var allfiles = fs.list(workingDirectory);
            for (var j = 0; j < allfiles.length; j++) {
                var fullfilepath = workingDirectory + fs.separator + allfiles[j];
                if (fs.isFile(fullfilepath)) {
                    if (fullfilepath.indexOf('.html') != -1) {
                        htmls.push(fullfilepath);
                        pdfs.push(fullfilepath.replace('.html', '.pdf'))
                    }
                }
            }
            if (htmls.length > 0) {
                job_id = curdir[i];
                break;
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
        update_status(job_id, "started")
        printPdf(htmls[index], pdfs[index]);
    } else {
        console.log("Continue daemon....");
        setTimeout(daemon, 5000);
    }
}

var update_status = function(job_id, status) {
    var updatepage = require('webpage').create(),
    server = 'http://localhost:3002/print/status',
    data = 'status='+status+'&job_id='+job_id+'&actor=PhantomJs&remark=Status update by PhamtoJs service.';
    updatepage.open(server, 'post', data, function (status) {
        if (status !== 'success') {
            console.log('Unable to post!');
        } else {
            console.log(updatepage.content);
        }
    });
}

daemon();

// give a source directory and destination directory
// phantomjs processes source and put everything into destination
