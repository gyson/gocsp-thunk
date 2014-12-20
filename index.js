'use strict';

module.exports = exports = thunk

var VERSION = 0.0 // 0.0.5 now

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

function execute(init, done, defer) {
    try {
        init(done, defer)
    } catch (e) {
        done(e)
    }
}

/*
    thunk(function (done) {
        done(null, 'value')
    })
    // yield new Channel('invalid arguments')
*/
function thunk(init, onCancel) {
    if (this && this.constructor === thunk) {
        throw new TypeError(
                'thunk is not a constructor function, call it w/o `new`')
    }

    var called = false
    var noListener = true
    var cancelled = false
    var listeners = []
    var error, value, e

    if (DEBUG_MODE) {
        e = new Error() // lazy evaluate `.stack`
    }

    execute(init, done, __thunk__)

    function done(err, val) {
        if (called || cancelled) { return }
        called = true

        error = err && DEBUG_MODE ? attach(err, e.stack) : err
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
        }
    }

    function __thunk__(arg0, arg1) {
        // return state.handle(arg0, arg1)
        if (typeof arg0 === 'function') {
            if (typeof arg1 === 'function') {
                // convert thunk to promise
                // e.g. new Promise(__thunk__: resolve, reject)
                __thunk__(function (err, val) {
                    //    reject      resolve
                    err ? arg1(err) : arg0(val)
                })
            } else {
                if (cancelled) { return }

                noListener = false

                if (called) {
                    // error isolation
                    // isolate this sync error to be consistent
                    // with async error isolation
                    invokeListener(arg0, error, value)
                } else {
                    listeners.push(arg0)
                }
            }
            return
        }

        switch (arg0) {
        case 'isDone':
            return called

        case 'getError':
            return error

        case 'getValue':
            return value

        case 'isCanceled':
        case 'isCancelled':
            return cancelled

        case 'isCancelable':
        case 'isCancellable':
            return typeof onCancel === 'function'

        case 'version':
            return VERSION

        case 'cancel':
            if (typeof onCancel !== 'function') {
                throw new Error('This thunk is uncancellable')
            }
            if (called || cancelled) {
                return void 0
            }
            cancelled = true
            listeners = null
            return onCancel(arg1) // it may throw exception, caller should deal with it.
        }

        throw new TypeError('invalid arguments')
    }

    return __thunk__
}

function isThunk(obj) {
    // function __thunk__(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    // typeof obj === 'function' && obj.length === 10
    return typeof obj === 'function' && obj.name === '__thunk__'
}

// compatible with js world w/o Function.name (e.g. IE)
if ((function named() {}).name !== 'named') {
    var _thunk = thunk
    // override
    thunk = function thunk(fn, onCancel) {
        var th = _thunk(fn, onCancel)
        th.__thunk__ = th
        return th
    }
    // override
    isThunk = function (obj) {
        return typeof obj === 'function' && obj.__thunk__ === obj
    }
}

exports.Thunk = exports.thunk = thunk
exports.isThunk = isThunk

// convert object (callback, promise) to thunk
// it always return a thunk
function from(obj) {
    if (isThunk(obj)) {
        return obj
    }
    // promise
    if (obj && typeof obj.then === 'function') {
        return thunk(function (cb) {
            promise.then(function (val) {
                cb(null, val)
            }, cb)
        })
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
exports.from = from
exports.toThunk = from

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
