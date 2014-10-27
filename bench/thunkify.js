
var fs = require('fs')
var co = require('gocsp-co')
var nodeThunkify = require('thunkify')
var gocspThunkify = require('gocsp-thunk').thunkify

// no much difference
// RESULT:
// $ nask bench bench/thunkify.js
// node-thunkify x 529 ops/sec ±0.95% (76 runs sampled)
// gocsp-thunk.ify x 541 ops/sec ±0.94% (58 runs sampled)
// Fastest is gocsp-thunk.ify


function test(stat, done) {
    co.spawn(function* () {
        for (var i = 0; i < 10; i++) {
            yield stat(__filename)
        }
    })(done)
}

exports['node-thunkify'] = function (done) {
    test(nodeThunkify(fs.stat), done)
}

exports['gocsp-thunk.ify'] = function (done) {
    test(gocspThunkify(fs.stat), done)
}
