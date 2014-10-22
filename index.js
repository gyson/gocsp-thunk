
'use strict'

module.exports = exports = thunk

var nextTick = (process && process.nextTick) || setImmediate
            || function (fn) { setTimeout(fn, 0) }

function panic(error) {
    nextTick(function () {
        throw error
    })
}

function thunk(fn) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
            'thunk is not a constructor function, call it w/o `new`')
    }
    var noCallback = true
    var called = false
    var list = []
    var err, val
    try {
        fn(function (error, value) {
            if (called) { return }
            called = true

            err = error
            val = value

            // throw uncaught exception if no cb until next tick
            if (err && noCallback) {
                nextTick(function () {
                    if (noCallback) {
                        throw err // uncaught exception
                    }
                })
            }

            list.forEach(function (cb) {
                try {
                    cb(err, val) // no exception allowed
                } catch (error) {
                    panic(error) // crash program
                }
            })
            list = null
        })
    } catch (error) {
        if (!called) {
            called = true
            err = error
        }
    }

    return function __thunk__(cb) {
        noCallback = false
        // convert thunk to promise if length === 2
        if (arguments.length === 2) {
            var resolve = arguments[0]
            var reject  = arguments[1]
            if (called) {
                err ? reject(err) : resolve(val)
            } else {
                list.push(function (err, val) {
                    err ? reject(err) : resolve(val)
                })
            }
            return
        }

        if (called) {
            try {
                cb(err, val) // no exception allowed
            } catch (error) {
                panic(error) // crash program
            }
        } else {
            list.push(cb)
        }
    }
}
exports.Thunk = exports.thunk = thunk

// TODO: compatibale with js world w/o Function.name ?
function isThunk(obj) {
    return typeof obj === 'function' && obj.name === '__thunk__'
}
exports.isThunk = isThunk

function from(promise) {
    return thunk(function (cb) {
        promise.then(function (val) {
            cb(null, val)
        }, cb)
    })
}
exports.from = from

function thunkify(fn) {
    if (typeof fn !== 'function') {
        throw new TypeError(fn + ' must be function')
    }
    return function __thunkified__() {
        var ctx = this
        var len = arguments.length
        var args = new Array(len + 1)
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i]
        }
        return thunk(function (cb) {
            args[len] = cb
            fn.apply(ctx, args)
        })
    }
}
exports.thunkify = exports.ify = thunkify

// e.g. fs / redis
function thunkifyAll(obj) {
    var ret = {}
    for (var name in obj) {
        if (typeof obj[name] === 'function') {
            ret[name] = thunkify(obj[name]).bind(obj)
        }
    }
    return ret
}
exports.thunkifyAll = exports.ifyAll = thunkifyAll
