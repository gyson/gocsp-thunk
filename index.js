
'use strict'

module.exports = exports = thunk

var nextTick = (process && process.nextTick) || setImmediate
            || function (fn) { setTimeout(fn, 0) }

// error isolation
function tryCatch(fn, ctx, args) {
    try {
        fn.apply(ctx, args)
    } catch (e) {
        nextTick(function () {
            throw e // error within callback
        })
    }
}

/*
    thunk(function (done) {
        done(null, 'value')
    })
*/
function thunk(fn) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
            'thunk is not a constructor function, call it w/o `new`')
    }
    var noCallback = true
    var called = false
    var ctx, args, list

    fn(function (err) {
        if (called) { return }
        called = true

        ctx = this
        args = arguments

        // throw uncaught exception if no cb until next tick
        if (err && noCallback) {
            nextTick(function () {
                if (noCallback) {
                    throw err // uncaught exception
                }
            })
        }
        if (list) {
            for (var i = 0; i < list.length; i++) {
                // async error isolation:
                // error from one callback should not affect others
                tryCatch(list[i], ctx, args)
            }
            list = null
        }
    })

    function __thunk__(cb) {
        noCallback = false

        // convert thunk to promise if length === 2
        // e.g. new Promise(__thunk__) ==> new promise instance
        if (arguments.length === 2) {
            var resolve = arguments[0]
            var reject  = arguments[1]
            __thunk__(function (err, val) {
                err ? reject(err) : resolve(val)
            })
            return
        }

        if (called) {
            // error isolation
            // isolate this sync error to be consistent
            // with async error isolation
            tryCatch(cb, ctx, args)
        } else {
            if (list) {
                list.push(cb)
            } else {
                list = [cb]
            }
        }
    }

    // make thunk awaitable (ES7 async/await) -- prefer alterative 1
    //
    // alterantive 1: not return promise, minimized one
    //
    // __thunk__.then = function (onFulfilled, onRejected) {
    //     assert(typeof onFulfilled === 'function')
    //     assert(typeof onRejected  === 'function')
    //     __thunk__(onFulfilled, onRejected)
    // }
    //
    // alternative 2: return a promise
    //
    // if (Promise) {
    //     __thunk__.then = function (onFulfilled, onRejected) {
    //         return new Promise(__thunk__).then(onFulfilled, onRejected)
    //     }
    // }

    return __thunk__
}

function isThunk(obj) {
    return typeof obj === 'function' && obj.name === '__thunk__'
}

// compatible with js world w/o Function.name (e.g. IE)
if ((function named() {}).name !== 'named') {
    var _thunk = thunk
    thunk = function (fn) {
        var th = _thunk(fn)
        th.__thunk__ = true
        return th
    }
    isThunk = function (obj) {
        return typeof obj === 'function' && obj.__thunk__
    }
}

exports.Thunk = exports.thunk = thunk
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
    return function /*__thunkified__*/() {
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
