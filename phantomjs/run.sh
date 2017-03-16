#!/bin/bash

phantomjs --debug=true  HelloJs.js "$PWD/1.html,$PWD/2.html" "$PWD/1.pdf,$PWD/2.pdf"