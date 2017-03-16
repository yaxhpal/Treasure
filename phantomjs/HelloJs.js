var webpage = require('webpage');
var system  = require('system');
var htmls   = system.args[1].split(','); 
var pdfs    = system.args[2].split(',');

var capture = function (page, pageUrl, callback) {
    page.open(pageUrl, function (status) {
        var interval, allDone;
        interval = setInterval(function () {
            var allDone = page.evaluate(function () { return window.chartReady;});
            if (allDone) {
                clearInterval(interval);
                callback();
            }
        }, 100);
    });
};

var page = webpage.create();

page.paperSize = {
    format: 'A4',
    orientation: 'portrait',
    margin: {top: '10px', right: '25px', bottom: '10px', left: '25px'},
    footer: {
        height: "30px",
        contents: phantom.callback(function(pageNum, numPages) {
            var footer_style = "border-top: .1em solid #000; padding-top: 5px; width:100%;font-size: 10px;text-align: center;";
            var footer_text  = "www.avanti.in";
            return "<div style='"+footer_style+"'>"+footer_text+"<span style='float:right;'>Page - "+pageNum +" / "+numPages+"</span></div>";
        })
    }
};

page.settings.dpi = 300
page.viewportSize = {
    height: 800,
    width: 2200
}

page.zoomFactor = 4;


var printPdf = function(htmlfile, pdffile) {

    var pageUrl = 'file://'+htmlfile; 

    capture(page, pageUrl, function (err) {
        if (err) {
            console.log(err);
        } else {
            page.render(pdffile, {format: 'pdf'});
        }
        
        if (index == htmls.length-1){
            phantom.exit();
        } else {
            index++;
            printPdf(htmls[index], pdfs[index]); 
        }

    });
}

var index = 0; 

printPdf(htmls[index], pdfs[index]);