
var fs = require('fs')
var co = require('gocsp-co')
var nodeThunkify = require('thunkify')
var gocspThunkify = require('gocsp-thunk').thunkify
var bluebirdPromisify = require('bluebird').promisify
var bluebirdZalgoPromisify = require('bluebird/js/zalgo/bluebird.js').promisify

// RESULT: no much difference
// $ nask bench bench/thunkify.js
// node-thunkify x 546 ops/sec ±1.19% (76 runs sampled)
// gocsp-thunk.ify x 576 ops/sec ±1.76% (55 runs sampled)
// bluebird-promisify x 521 ops/sec ±1.31% (79 runs sampled)
// bluebird-zalgo-promisify x 532 ops/sec ±1.42% (76 runs sampled)
// Fastest is gocsp-thunk.ify

function test(stat, done) {
    co.spawn(function* () {
        for (var i = 0; i < 10; i++) {
            yield stat(__filename)
            //console.log(yield stat(__filename))
        }
    })(done)
}

exports['node-thunkify'] = function (done) {
    test(nodeThunkify(fs.stat), done)
}

exports['gocsp-thunk.ify'] = function (done) {
    test(gocspThunkify(fs.stat), done)
}

exports['bluebird-promisify'] = function (done) {
    test(bluebirdPromisify(fs.stat), done)
}

exports['bluebird-zalgo-promisify'] = function (done) {
    test(bluebirdZalgoPromisify(fs.stat), done)
}
