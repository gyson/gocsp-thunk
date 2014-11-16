
'use strict'

module.exports = exports = thunk

var nextTick = (process && process.nextTick) || setImmediate
            || function (fn) { setTimeout(fn, 0) }

// error isolation
function tryCatch(fn, args) {
    try {
        // little optimization for common case
        switch (args.length) {
        case 0:  return fn()
        case 1:  return fn(args[0])
        case 2:  return fn(args[0], args[1])
        default: return fn.apply(void 0, args)
        }
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
    var args, first, rest = []

    fn(function done(err) {
        if (called || cancelled) { return }
        called = true
        //args = arguments
        args = new Array(arguments.length)
        for (var i = 0; i < arguments.length; i++) {
            args[i] = arguments[i]
        }

        if (noCallback) {
            if (err) {
                nextTick(function () {
                    if (noCallback) {
                        throw err // uncaught exception
                    }
                })
            }
        } else {
            tryCatch(first, args)
            for (var i = 0; i < rest.length; i++) {
                tryCatch(rest[i], args)
            }
        }
    })

    return function __thunk__(arg0, arg1) {
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
            first = null // clear callbacks if any
            rest = null
            onCancel()
            return true // return onCancel() ?

        case 1:
            // check state of thunk
            // thunkFn('isDone') => boolean
            // thunkFn('isCancelled') => boolean
            switch (arg0) {
            case 'isDone':
                return called

            case 'isCancelled':
                return cancelled

            case 'isCancellable':
                return typeof onCancel === 'function'

            case 'cancel':
                return __thunk__()

            default:
                if (typeof arg0 !== 'function') {
                    throw new Error(arg0 +
                        ' is not a valid command (isDone, isCancelled,' +
                        ' isCancellable, cancel) or function')
                }
                if (cancelled) {
                    throw new Error('Cannot listen after cancellation')
                    // return false // fail to listen a cancalled thunk
                }
                if (called) {
                    // error isolation
                    // isolate this sync error to be consistent
                    // with async error isolation
                    tryCatch(arg0, args)
                } else {
                    if (noCallback) {
                        first = arg0
                    } else {
                        rest.push(arg0)
                    }
                }
                noCallback = false
                return
            }

        case 2:
            // convert thunk to promise if length === 2
            // e.g. new Promise(__thunk__) ==> new promise instance
            var resolve = arg0
            var reject  = arg1
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

// need to optimize `resolve` and `reject` ?
// function resolve(obj) {
//     return thunk(function (cb) {
//         cb(null, obj)
//     })
// }
// exports.resolve = resolve
//
// function reject(obj) {
//     return thunk(function (cb) {
//         cb(obj)
//     })
// }
// exports.reject = reject

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
