
'use strict'

module.exports = exports = thunk

var nextTick = (process && process.nextTick) || setImmediate
            || function (fn) { setTimeout(fn, 0) }

// 0 - no stack trace support
// 1 - stack trace with filter
// 2 - full stack and source map
var DEBUG_MODE = 0

// is node and `--gocsp-thunk-debug 0/1/2`
// check if it's debug mode
if (process && process.argv) {
    var cmd = process.argv.join(' ')
    if (cmd.match(/--gocsp-thunk-debug 1/)) {
        DEBUG_MODE = 1
    }
    if (cmd.match(/--gocsp-thunk-debug 2/)) {
        DEBUG_MODE = 2
    }
}

var ignore = new RegExp(''
    + 'gocsp\-thunk/index.js:|'
    + 'gocsp\-go/index.js:|'
    + 'timers.js:|module.js:|fs.js:|'
    + 'GeneratorFunctionPrototype.next'
)

// attach more stack message to Error instance
function attach(err, stack) {
    if (err && typeof err.stack === 'string') {
        if (DEBUG_MODE === 1) {
            var lines = stack.split('\n').slice(1)
                        .filter(function (line) {
                            return !line.match(ignore)
                        })
            if (lines.length > 0) {
                err.stack += '\n----\n' + lines.join('\n')
            }
        } else {
            err.stack += '\n----\n' + stack
        }
    }
    return err
}

// it's not allowed to have exception within listener callbacks
function invokeListener(listener, err, val) {
    try {
        listener(err, val)
    } catch (e) {
        // panic, probably crash program
        nextTick(function () {
            throw e // error within thunk listener callback
        })
    }
}

function execute(init, done) {
    try {
        init(done)
    } catch (e) {
        done(e)
    }
}

/*
    thunk(function (done) {
        done(null, 'value')
    })
*/
function thunk(init, onCancel) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
            'thunk is not a constructor function, call it w/o `new`')
    }
    var noListener = true
    var cancelled = false
    var called = false
    var listeners = []
    var error, value, stack

    if (DEBUG_MODE) {
        stack = new Error().stack
    }

    execute(init, function done(err, val) {
        if (called || cancelled) { return }
        called = true

        error = DEBUG_MODE ? attach(err, stack) : err
        value = val

        if (noListener) {
            if (error) {
                nextTick(function () {
                    if (noListener) {
                        throw error // uncaught exception
                    }
                })
            }
        } else {
            for (var i = 0; i < listeners.length; i++) {
                invokeListener(listeners[i], error, value)
            }
            listeners = null
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
            listeners = null
            onCancel() // it may throw exception, caller should deal with it.
            return true
            // return onCancel()

        case 1:
            // check state of thunk
            // thunkFn('isDone') => boolean
            // thunkFn('isCancelled') => boolean
            switch (arg0) {
            case 'isDone':
                return called

            case 'getError':
                return error

            case 'getValue':
                return value

            case 'isCancelled':
                return cancelled

            case 'isCancellable':
                return typeof onCancel === 'function'

            case 'cancel':
                return __thunk__()

            default:
                if (typeof arg0 !== 'function') {
                    throw new Error(arg0
                        + ' is not a valid command (isDone, isCancelled,'
                        + ' isCancellable, cancel) or function')
                }
                if (cancelled) {
                    throw new Error('Cannot listen after cancellation')
                    // return false // fail to listen a cancalled thunk
                }
                noListener = false

                if (called) {
                    // error isolation
                    // isolate this sync error to be consistent
                    // with async error isolation
                    invokeListener(arg0, error, value)
                } else {
                    listeners.push(arg0)
                }
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
    // override
    thunk = function thunk(fn, onCancel) {
        var th = _thunk(fn, onCancel)
        th.__thunk__ = true
        return th
    }
    // override
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

// convert object (callback, promise) to thunk
// it always return a thunk
function toThunk(obj) {
    if (isThunk(obj)) {
        return obj
    }
    // promise
    if (obj && typeof obj.then === 'function') {
        return from(obj)
    }
    // just callbacks
    if (typeof obj === 'function') {
        return thunk(obj)
    }
    // error, invalid type
    return thunk(function () {
        throw new TypeError(obj + ' is not thunk, callback, or promise.')
    })
}
exports.toThunk = toThunk

function thunkify(fn) {
    if (typeof fn !== 'function') {
        throw new TypeError(fn + ' must be function')
    }
    return function /* __thunkified__ */() {
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
