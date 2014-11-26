
var test = require('tape')
var thunk = require('..')

test('first call win', function (t) {
    t.plan(1)
    thunk(function (cb) {
        setTimeout(function () {
            cb('ERROR_1')
            cb('ERROR_2')
            cb('ERROR_3')
        }, 10)
    })(function (err) {
        t.assert(err, 'ERROR_1')
    })
})

test('should not call if no callback', function (t) {
    t.plan(1)
    var called = false
    thunk(function (cb) {
        // no cb
    })(function () {
        called = true
    })
    setTimeout(function () {
        t.assert(called === false)
    }, 10)
})

test('should return same result for multiple calls', function (t) {
    t.plan(3)
    var th = thunk(function (cb) {
        setTimeout(function () {
            cb(null, 'VALUE')
        }, 10)
    })
    th(function (err, val) {
        t.assert(val === 'VALUE')
    })
    th(function (err, val) {
        t.assert(val === 'VALUE')
    })
    th(function (err, val) {
        t.assert(val === 'VALUE')
    })
})
