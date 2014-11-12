
var thunk = require('..')
var assert = require('assert')

describe('cancel', function () {
    it('should call onCancel after cancellation', function (done) {
        var cancelled = true
        var th = thunk(function () {

        }, function onCancel() {
            done()
        })
        setTimeout(function () {
            th() // => cancel
        }, 10)
    })
    it('should not fulfill or reject after cancellation', function (done) {
        var th = thunk(function (cb) {
            setTimeout(function () {
                cb(new Error)
            }, 100)
        }, function onCancel() {
            done()
        })
        th(done)
        setTimeout(function () {
            th()
        }, 20)
    })
})
