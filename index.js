
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
    thunk(function (cb) {
        cb(null, 'value')
    })
*/
function thunk(fn) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
            'thunk is not a constructor function, call it w/o `new`')
    }
    var noCallback = true
    var called = false
    var list = []
    var ctx, args

    fn(function (err) {
        if (called) { return }
        called = true

        ctx = this
        args = arguments

        // only enable it in develop env ?
        // throw uncaught exception if no cb until next tick
        if (err && noCallback) {
            nextTick(function () {
                if (noCallback) {
                    throw err // uncaught exception
                }
            })
        }

        for (var i = 0; i < list.length; i++) {
            // async error isolation:
            // error from one callback should not affect others
            tryCatch(list[i], ctx, args)
        }
        list = null
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
            list.push(cb)
        }
    }

    // if really necessary, we can add `.then` to thunk
    // and then it is just a promise.
    // __thunk__.then = function (onFulfilled, onRejected) {
    //     return new Promise(__thunk__).then(onFulfilled, onRejected)
    // }

    return __thunk__
}
exports.Thunk = exports.thunk = thunk

// TODO: compatible with js world w/o Function.name ???
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
