
var test = require('tape')
var thunk = require('./index')

test('sync', function (t) {
    t.test('thunk()', function (t) {
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

    t.test('should not catch exception if any', function (t) {
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

    t.test('should return same result for multiple calls', function (t) {
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
})

test('async', function (t) {
    t.test('first call win', function (t) {
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

    t.test('should not call if no callback', function (t) {
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

    t.test('should return same result for multiple calls', function (t) {
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
})

test('cancel', function (t) {
    t.test('should call onCancel after cancellation', function (t) {
        t.plan(1)
        var cancelled = true
        var th = thunk(function () {

        }, function onCancel() {
            t.assert(cancelled)
        })

        th(function () {
            cancelled = false
        })

        setTimeout(function () {
            th('cancel') // => cancel
        }, 10)
    })

    t.test('should not fulfill or reject after cancellation', function (t) {
        t.plan(2)
        var th = thunk(function (cb) {
            setTimeout(function () {
                cb(new Error)
            }, 50)
        }, function onCancel() {
            t.assert(cancelled)
        })

        var cancelled = true
        th(function () {
            cancelled = false // should never execute this
        })

        setTimeout(function () {
            th('cancel')
        }, 20)

        setTimeout(function () {
            t.assert(cancelled)
        }, 100)
    })
})
