/**
 * @License Avanti Learning Centres Pvt Ltd
 * (c) 2017 Avanti Learning Centres Pvt Ltd, http://avanti.in
 */

 "use strict";
 var page                    = null;
 var system                  = require('system');
 var fs                      = require('fs');
 var wp                      = require('webpage');

// Global variables
var baseSource              = system.args[1]
var baseDestination         = system.args[2]
var server                  = system.args[3]

var htmls                   = [];
var pdfs                    = [];
var currHtmlFileIndx        = 0;
var activeJobId             = null;
var serviceHandle           = null;

var COPYING_FLAG            = "_copying";


// Print Job statuses
var JOB_STATUS = {
    QUEUED: {
        name:   "queued",
        actor:  "PhantomJS",
        remark: "Print Job queued."
    },
    STARTED: {
        name:   "started",
        actor:  "PhantomJS",
        remark: "Print Job started."
    },
    FAILED: {
        name:   "failed",
        actor:  "PhantomJS",
        remark: "Print Job has failed."
    },
    FINISHED: {
        name:   "finished",
        actor:  "PhantomJS",
        remark: "Print Job has finished."
    },    
    ARCHIVED: {
        name:   "archived",
        actor:  "PhantomJS",
        remark: "Print Job has been archived."
    }
};

/**
 * This function checks whether Chartjs has finished 
 * redendering all charts.
 * @since 1.0.0
 * @param {string} page Webpage.
 * @param {string} url URL to be loaded into the page.
 * @param {callback} cb Callback to be called once page is finished loading.
 */
 var capture = function(page, url, cb) {
    page.open(url, function(status) {
        var interval, allDone;
        interval = setInterval(function() {
            var allDone = page.evaluate(function() { 
                return window.chartReady; 
            });

            if (allDone) {
                clearInterval(interval);
                cb();
            }
        }, 100);
    });
};

/**
 * Set basic properties of the Web Page and returns it. As, it sets properties 
 * of global page, it is done once.
 * @since 1.0.0
 * @return {Web Page} page Phantomjs Web page with set properties.
 */
 var getWebPage = function() {

    if (page) { return page; }

    console.log("Creating fresh Web Page.");
    page = wp.create();
    page.paperSize = {
        format: 'A4',
        orientation: 'portrait',
        margin: { top: '10px', right: '25px', bottom: '10px', left: '25px' },
        footer: {
            height: "30px",
            contents: phantom.callback(function(pageNum, numPages) {
                var footer_style = "border-top: .1em solid #000; padding-top: "
                +" 5px; width:100%;font-size: 10px;text-align: center;";
                var footer_text = "www.avanti.in";
                return "<div style='" + footer_style + "'>" + footer_text + 
                "<span style='float:right;'>Page - " + pageNum + " / " 
                + numPages + "</span></div>";
            })
        }
    };

    page.settings.dpi = 300;
    page.viewportSize = { height: 800, width: 2200};
    page.zoomFactor = 4;

    return page;
}

/**
 * It converts HTML file into PDF file.  
 * @since 1.0.0
 * @param {string} htmlfile Webpage.
 * @param {string} pdffile URL to be loaded into the page.
 */
 var printPdf = function(htmlfile, pdffile) {

    var pageUrl = 'file://' + htmlfile;

    page = getWebPage();

    capture(page, pageUrl, function(err) {
        if (err) {
            console.log("Error: " + err + " Aborting job: "+ activeJobId);
            updateStatus(activeJobId, JOB_STATUS.FAILED, err);
            // Continue with service
            PhantomService.start();
        } else {
            page.render(pdffile, { format: 'pdf'; });
            fs.remove(htmlfile);
            // If all files are processed from given directory, then start
            // checking others
            if (currHtmlFileIndx === (htmls.length - 1)) {
                var sourceDir = baseSource+activeJobId+fs.separator;
                var destDir   = baseDestination+activeJobId+fs.separator;
                // Move entire directory to destonation location
                fs.copyTree(sourceDir, destDir);
                fs.removeTree(sourceDir);
                // Send update to Rails server
                updateStatus(activeJobId, JOB_STATUS.FINISHED);
                // Continue with service
                PhantomService.start();
            } else { // Else continue processing files in the give directory
                currHtmlFileIndx++;
                printPdf(htmls[currHtmlFileIndx], pdfs[currHtmlFileIndx]);
            }
        }
    });
}


/**
 * Scans the source directory for HTML files.
 * @since 1.0.0
 */
 var htmlFilesList = function() {
    htmls           = [];
    pdfs            = [];
    var basePath    = baseSource;
    var workingDir  = null

    // Get List of all files under base source directory.
    // Also, remove '.' and '..' directories from the list (slice)
    var allDirs   = fs.list(basePath).slice(2); 
    
    for (var i = 0; i < allDirs.length; i++) {
        var fullpath = basePath + allDirs[i];
        // Do not process with COPYING_FLAG in their names
        if(fs.isDirectory(fullpath) && !fullpath.includes(COPYING_FLAG)) {
            workingDir = fullpath;
            var allfiles = fs.list(workingDir);
            for (var j = 0; j < allfiles.length; j++) {
                var fullfilepath = workingDir + fs.separator + allfiles[j];
                if (fs.isFile(fullfilepath)) {
                    if (fullfilepath.indexOf('.html') != -1) {
                        htmls.push(fullfilepath);
                        pdfs.push(fullfilepath.replace('.html', '.pdf'))
                    }
                }
            }
            if (htmls.length > 0) {
                activeJobId = allDirs[i];
                break;
            }
        }
    }
    console.log('Number of Html Files: ' + htmls.length);
}

/**
 * It sends status updates to the Rails server.  
 * @since 1.0.0
 * @param {string} activeJobId Current job id.
 * @param {string} status Status to be sent.
 * @param {string} extraRemark Optional, If you want to override standard 
 * status remark.
 */
 var updateStatus = function(activeJobId, status, extraRemark) {
    var remark = extraRemark ? extraRemark : status.remark;
    var updatepage = wp.create();
    var request = {
      operation: "POST",
      encoding: "utf8",
      headers: {"Content-Type": "application/json"},
      data: JSON.stringify({
        status: status.name,
        activeJobId: activeJobId,
        actor: status.actor,
        remark: remark
    })};
      updatepage.open(server, 'POST', request, function (status) {
        if (status !== 'success') {
            console.log('Unable to post!');
        } else {
            console.log(updatepage.content);
        }
    });
  }


/**
 * Main service daemon.   
 * @since 1.0.0
 */
 var PhantomService = { 
    start: function() {
        htmlFilesList();
        if (htmls.length > 0) {
            console.log("Printing pdfs....");
            // Initialize the index for current group of files
            currHtmlFileIndx = 0;
            update_status(activeJobId, JOB_STATUS.STARTED)
            printPdf(htmls[currHtmlFileIndx], pdfs[currHtmlFileIndx]);
        } else {
            console.log("Continue daemon....");
            serviceHandle = setTimeout(PhantomService.start, 5000);
        }
    },
    stop: function() {
        console.log("Stoping PhantomJs service.")
        clearTimeout(serviceHandle);
        phantom.exit();
    }
}



if (system.args.length < 3) {
    console.log("Usages: service <HTML base directory path> "+
        "<PDF base Directory path> <LMS server path url>");
    PhantomService.stop(); 
} else {
    // Start service
    PhantomService.start();
}

