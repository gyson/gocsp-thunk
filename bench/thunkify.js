
var fs = require('fs')
var co = require('gocsp-co')
var go = require('gocsp-go')
var nodeThunkify = require('thunkify')
var gocspThunkify = require('../index').thunkify
var Bluebird = require('bluebird')
var BluebirdZalgo = require('bluebird/js/zalgo/bluebird.js')

// RESULT: no much difference
// $ nask bench bench/thunkify.js
// node-thunkify x 546 ops/sec ±1.19% (76 runs sampled)
// gocsp-thunk.ify x 576 ops/sec ±1.76% (55 runs sampled)
// bluebird-promisify x 521 ops/sec ±1.31% (79 runs sampled)
// bluebird-zalgo-promisify x 532 ops/sec ±1.42% (76 runs sampled)
// Fastest is gocsp-thunk.ify

var n = 5

function test(stat, done) {
    go(function* () {
        for (var i = 0; i < n; i++) {
            yield stat(__filename)
            // yield process.nextTick
            //console.log(yield stat(__filename))
        }
    })(done)
}

var fn = fs.readFile

exports['baseline'] = function (done) {
    var i = 0
    next()
    function next() {
        if (i < n) {
            i++
            fn(__filename, next)
        } else {
            done()
        }
    }
}

var thunking = gocspThunkify(fn)
exports['baseline - thunkified'] = function (done) {
    var i = 0
    next()
    function next() {
        if (i < n) {
            i++
            thunking(__filename)(next)
        } else {
            done()
        }
    }
}

var nodeThunkifiedStat = nodeThunkify(fn)

exports['node-thunkify'] = function (done) {
    go(function* () {
        for (var i = 0; i < n; i++) {
            yield nodeThunkifiedStat(__filename)
        }
        done()
    })
}

var gocspThunkifiedStat = gocspThunkify(fn)

exports['gocsp-thunk.ify'] = function (done) {
    go(function* () {
        for (var i = 0; i < n; i++) {
            yield gocspThunkifiedStat(__filename)
        }
        done()
    })
}

var bluebirdPromisifiedStat = Bluebird.promisify(fn)

exports['bluebird-promisify'] = function (done) {
    Bluebird.coroutine(function* () {
        for (var i = 0; i < n; i++) {
            yield bluebirdPromisifiedStat(__filename)
        }
        done()
    })()
}

var bluebirdZalgoPromisifiedStat = BluebirdZalgo.promisify(fn)

exports['bluebird-zalgo-promisify'] = function (done) {
    BluebirdZalgo.coroutine(function* () {
        for (var i = 0; i < n; i++) {
            yield bluebirdZalgoPromisifiedStat(__filename)
        }
        done()
    })()
}
