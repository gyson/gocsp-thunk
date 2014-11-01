
var thunk = require('..')
var assert = require('assert')

describe('thunk()', function () {
    describe('sync callback', function () {
        it('should use result from first callback', function (done) {
            var isSync = true
            thunk(function (cb) {
                cb('ERROR_1')
                cb('ERROR_2')
                cb('ERROR_3')
            })(function (err) {
                assert(isSync)
                assert(arguments.length === 1)
                assert(err === 'ERROR_1')
                done()
            })
            isSync = false
        })
        it('should not catch exception if any', function (done) {
            var match = false
            var err = new Error()
            try {
                thunk(function (cb) {
                    throw err
                })
            } catch (e) {
                match = e === err
            }
            assert(match)
            done()
        })
        it('should return same result for multiple calls', function (done) {
            var th = thunk(function (cb) {
                cb(null, 'VALUE')
            })
            var isSync = true
            th(function (err, val) {
                assert(err === null)
                assert(val === 'VALUE')
                th(function (err, val) {
                    assert(err === null)
                    assert(val === 'VALUE')
                    th(function (err, val) {
                        assert(isSync)
                        assert(err === null)
                        assert(val === 'VALUE')
                        done()
                    })
                })
            })
            isSync = false
        })
        it('should accept multipe arguments', function (done) {
            var isSync = true
            thunk(function (cb) {
                cb('A_0', 'A_1', 'A_2', 'A_3')
            })(function () {
                assert(isSync)
                assert(arguments.length === 4)
                assert(arguments[0] === 'A_0')
                assert(arguments[1] === 'A_1')
                assert(arguments[2] === 'A_2')
                assert(arguments[3] === 'A_3')
                done()
            })
            isSync = false
        })
        it('should reserve the context of callback', function (done) {
            var ctx = {}
            var isSync = true
            thunk(function (cb) {
                cb.call(ctx, 0, 1, 2, 3, 4)
            })(function () {
                assert(isSync)
                assert(arguments.length === 5)
                assert(this === ctx)
                assert(arguments[0] === 0)
                assert(arguments[1] === 1)
                assert(arguments[2] === 2)
                assert(arguments[3] === 3)
                assert(arguments[4] === 4)
                done()
            })
            isSync = false
        })
    })
    describe('async callback', function () {
        it('should use result from first callback', function (done) {
            thunk(function (cb) {
                setTimeout(function () {
                    cb('ERROR_1')
                    cb('ERROR_2')
                    cb('ERROR_3')
                }, 10)
            })(function (err) {
                assert(arguments.length === 1)
                assert(err === 'ERROR_1')
                done()
            })
        })
        it('should not call if no callback', function (done) {
            var called = false
            thunk(function (cb) {
                // no cb
            })(function () {
                called = true
            })
            setTimeout(function () {
                assert(called === false)
                done()
            }, 10)
        })
        it('should return same result for multiple calls', function (done) {
            var th = thunk(function (cb) {
                setTimeout(function () {
                    cb(null, 'VALUE')
                }, 10)
            })
            th(function (err, val) {
                assert(val === 'VALUE')
                th(function (err, val) {
                    assert(val === 'VALUE')
                    th(function (err, val) {
                        assert(val === 'VALUE')
                        done()
                    })
                })
            })
        })
        it('should accept multipe arguments', function (done) {
            thunk(function (cb) {
                setTimeout(function () {
                    cb('A_0', 'A_1', 'A_2', 'A_3')
                }, 10)
            })(function () {
                assert(arguments.length === 4)
                assert(arguments[0] === 'A_0')
                assert(arguments[1] === 'A_1')
                assert(arguments[2] === 'A_2')
                assert(arguments[3] === 'A_3')
                done()
            })
        })
        it('should reserve the context of callback', function (done) {
            var ctx = {}
            thunk(function (cb) {
                setTimeout(function () {
                    cb.call(ctx, 0, 1, 2, 3, 4)
                }, 10)
            })(function () {
                assert(arguments.length === 5)
                assert(this === ctx)
                assert(arguments[0] === 0)
                assert(arguments[1] === 1)
                assert(arguments[2] === 2)
                assert(arguments[3] === 3)
                assert(arguments[4] === 4)
                done()
            })
        })
    })
})
