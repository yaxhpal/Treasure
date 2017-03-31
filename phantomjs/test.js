var fs = require('fs');

var content = fs.read('config.json');
console.log('read data:', content);
settings = JSON.parse(content);
console.log("Name is " + settings.name);
