'use strict';
var http = require('http');
var path = require('path');
var express = require('express');
var app = express();
app.use(express.static('node_modules'));
app.use(express.static('js'));
var port = process.env.PORT || 1337;
var fs = require('fs');

fs.readFile('./index.html', function (err, html) {
    if (err) {
        throw err;
    }
    http.createServer(function (request, response) {
        response.writeHeader(200, { "Content-Type": "text/html" });
        response.write(html);
        response.end();
    }).listen(port);
});

app.listen(3000);