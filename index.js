
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
function thunk(fn, onCancel) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
            'thunk is not a constructor function, call it w/o `new`')
    }
    var noCallback = true
    var cancelled = false
    var called = false
    var ctx, args, list

    fn(function (err) {
        if (called || cancelled) { return }
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

    return function __thunk__() {
        switch (arguments.length) {
        case 0:
            // cancel
            if (typeof onCancel !== 'function') {
                throw new Error('This thunk is uncancellable')
            }
            if (called || cancelled) {
                return false
            }
            cancelled = true
            list = null
            onCancel()
            return true
        case 1:
            // check state of thunk
            // thunkFn('isDone') => boolean
            // thunkFn('isCancelled') => boolean
            // if (arguments[0] === 'isDone') {
            //     return called
            // }
            // if (arguments[0] === 'isCancelled') {
            //     return cancelled
            // }
            // if (arguments[0] === 'isCancellable') {
            //     return typeof onCancel === 'function'
            // }
            if (cancelled) {
                throw new Error('Cannot listen after cancellation')
                // return false // fail to listen a cancalled thunk
            }
            noCallback = false
            if (called) {
                // error isolation
                // isolate this sync error to be consistent
                // with async error isolation
                tryCatch(arguments[0], ctx, args)
            } else {
                if (list) {
                    list.push(arguments[0])
                } else {
                    list = [arguments[0]]
                }
            }
            return
        case 2:
            // convert thunk to promise if length === 2
            // e.g. new Promise(__thunk__) ==> new promise instance
            var resolve = arguments[0]
            var reject  = arguments[1]
            __thunk__(function (err, val) {
                err ? reject(err) : resolve(val)
            })
            return
        default:
            throw new Error('invalid number of arguments')
        }
    }
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
