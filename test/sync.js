
var test = require('tape')
var thunk = require('..')

test('thunk()', function (t) {
    t.plan(2)
    var isSync = true
    thunk(function (cb) {
        cb('ERROR_1')
        cb('ERROR_2')
        cb('ERROR_3')
    })(function (err) {
        t.assert(isSync)
        t.assert(err === 'ERROR_1')
    })
    isSync = false
})

test('should not catch exception if any', function (t) {
    t.plan(2)
    var err = new Error()
    var caught = false
    try {
        thunk(function (cb) {
            throw err
        })(function (e) {
            t.equal(e, err)
        })
    } catch (e) {
        var caught = true
    }
    t.assert(!caught)
})

test('should return same result for multiple calls', function (t) {
    t.plan(9)
    var th = thunk(function (cb) {
        cb(null, 'VALUE')
    })
    var isSync = true
    th(function (err, val) {
        t.assert(isSync)
        t.assert(err === null)
        t.assert(val === 'VALUE')
    })
    th(function (err, val) {
        t.assert(isSync)
        t.assert(err === null)
        t.assert(val === 'VALUE')
    })
    th(function (err, val) {
        t.assert(isSync)
        t.assert(err === null)
        t.assert(val === 'VALUE')
    })
    isSync = false
})
