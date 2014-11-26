
var test = require('tape')
var thunk = require('..')

test('should call onCancel after cancellation', function (t) {
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
        th() // => cancel
    }, 10)
})

test('should not fulfill or reject after cancellation', function (t) {
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
        th()
    }, 20)

    setTimeout(function () {
        t.assert(cancelled)
    }, 100)
})
