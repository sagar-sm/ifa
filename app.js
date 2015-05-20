var express = require('express');
var port = process.env.PORT || 8000;
var app = express();

app.use('/', express.static(__dirname + '/alumni-viz/'));

app.get('/', function(request, response) {
    response.sendfile(__dirname + '/alumni-viz/index.htm');
}).listen(port);