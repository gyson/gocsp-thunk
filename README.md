
# gocsp-thunk

Thunk as a compatible alternative to Promise

## Note

This repository is just an raw experiment and not a proper thunk reference.

If you are looking for a robust or detailed thunk implementation, you may want to check out [thunks](https://github.com/thunks/thunks).

## Install

```
npm install gocsp-thunk
```

## Example

```js
var thunk = require('gocsp-thunk')

// create a thunk function
var thunkFn = thunk(function (cb) {
    setTimeout(function () {
        cb(null, 'Hi')
    }, 100)
})

// get value from thunk function
thunkFn(function (err, val) {
    console.log(val) // => 'Hi'
})

// convert thunk function into native Promise
new Promise(thunkFn).then(console.log) // => 'Hi'
```

## Thunk <=> Promise

It's super easy to convert one to the other.

* do `thunk.from(promise)` to convert promise to thunk function
* do `new Promise(thunkFn)` to convert thunk function to promise

Note: you should not use any falsy value (`false`, `null`, `undefined`, `0`, etc) as exception.

## Thunk vs Promise

Both thunk and promise are immutable and eager (execution). But thunk has following difference:

* Thunk has **no chaining**. Unlike `promise.then`, `thunkFn(cb)` will **NOT** return another thunk. Use generator / asyncFn solution to resolve sequential thunks or promises.
* Thunk is **synchronously**. It will callback synchronously whenever data is ready.
* Thunk has **no** static methods like `.all`, `.race`. The equivalence are provided by different modules:
    * `.all`: check [gocsp-all](https://github.com/gyson/gocsp-all)
    * `.race`: check [gocsp-select](https://github.com/gyson/gocsp-select)
* Thunk will **not** catch exception within execute function (from `thunk( executeFn )`).

## Error Isolation

The error / exception within cb should not affect others.

The basic policy of error handling within callbacks is not allowing exception. If it does, the error will be caught and re-throw in next tick, which may crash program (add listener to prevent crash, e.g.  `process.on('uncaughtException', listener)`).

Example:
```js
var thunkFn = thunk(function (cb) {
    setTimeout(function () {
        cb(null, 123)
    }, 1000)
})
thunkFn(function cb() {
    // this exception will be caught
    // and re-throw in nextTick
    throw new Error()
})
// add listener to process to prevent potential crash
process.on('uncaughtException', listener)
```

It will be troublesome to have sync / async callbacks without error isolation.

## Uncaught Exception

Thunk should not swallow exceptions.

If a thunkFn is rejected (e.g. `cb(new Error)`) and it has no listeners (callbacks), it will wait until next tick, if still no listeners, it will throw error globally, which probably will crash the program. To prevent crash, you can simply add a noop listener to thunk function or add a listener on `process.on('uncaughtException', listener)`.

Example:
```js
// thunk function has no listener, but it is rejected
// therefore, it will be re-throw in next tick if there
// is no listener at that time
var thunk = require('gocsp-thunk')
var thunkFn = thunk(function (cb) {
    cb(new Error)
})
```

Add noop listener to prevent crash:
```js
thunkFn(function noop() {})
```

Add listener on process:
```js
process.on('uncaughtException', function (err) {
    // ...
})
```

## Sync or Async ?

`thunkFunction(cb)` will invoke `cb` as soon as data is ready, which means if data is already there, `cb` will be invoke immediately / synchronously.

You may notice that this will lead the execution of `cb` be indeterministic (aka. [zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)). Then following code will help you to check if it's sync or async.

```js
var called = false
thunk(function () {
    called = true
    // exception is isolated, even you
    // throw exception here, it will not
    // affect outside of this callback function
})
if (called) {
    // it's sync
} else {
    // it's async
}
```

Also, the coroutine solution will help to determine the order of execution, as following.

```js
var co = require('gocsp-co')
co(function* () {
    // do first
    yield thunkFunction // wait
    // do last
})()
```

Another problem with sync call is stack overflow when deep recursive sync call. Hope this could be solved by ES6 proper tail call ?

Anyway, you can always convert thunk function to promise if you want to ensure zalgo-free.

```js
new Promise(thunkFunction).then(function () {
    // do it async
})
```

## Cancellation

You could cancel the thunk operation

Example:
```js
function timeout(time) {
    var ref
    return thunk(function init(done) {
        ref = setTimeout(done, time)
    }, onCancel() {
        clearTimeout(ref)
    })
}

var fn = timeout(1000)
fn(function () {
    doSomethingCool()
})

fn('cancel')
```

## API Reference
### `thunk( executor )`

Return a thunk function for deferred and asynchronous computations.
Similar to `new Promise( executor )`, but `executor`
only has one argument `cb`. Usually, use `cb(error)` for
rejecting, and use `cb(null, value)` for fulfilling.

Example:
```js
var thunk = require('gocsp-thunk')
var thunkFn = thunk(function (cb) {
    // do some work
    cb(null, 'I am done')
})
// get value from thunk function.
// call `thunkFn` multiple times will get the same result
thunkFn(function (err, val) {
    assert(val === 'I am done')
})
// wrap node style callbacks as thunk
thunk(cb => fs.readFile('path', 'utf8', cb))
```
---
### `new Promise( thunkFunction )`

Convert a thunk function to a Promise instance

```js
// convert to Native Promise
var thunk = require('gocsp-thunk')
new Promise(thunk(function (cb) {
    cb(null, 10)
}))
.then(function (val) {
    assert(val === 10)
})
```
---
### `thunk.from( promise )`

Convert a Promise instance to a thunk function.

Example:
```js
var thunk = require('gocsp-thunk')
var thunkFn = thunk.from(Promise.resolve(10))
thunkFn(function (err, val) {
    assert(val === 10)
})
```
---
### `thunk.isThunk( object )`

Check if an object is thunk function.

Example:
```js
var thunk = require('gocsp-thunk')
thunk.isThunk(123) // => false
thunk.isThunk(function () {}) // => false
thunk.isThunk(thunk(cb => cb())) // => true
```
---
### `thunk.ify( fn )` or `thunk.thunkify( fn )`

Wrap node style function (callback as last argument)
to one which returns a thunk

Example:
```js
var thunk = require('gocsp-thunk')
var readFile = thunk.ify(require('fs').readFile)
readFile(__filename, 'utf8')(function (err, val) {
    if (err) { throw err }
    console.log(val)
})
```
---
### `thunk.ifyAll( object )` or `thunk.thunkifyAll( object )`

Wrap object with node style function as property or in prototype
chain into new object with all thunkifed methods.

Example:
```js
var redis = require('redis')
var co = require('gocsp-co')
var thunk = require('gocsp-thunk')

var client = thunk.ifyAll(redis.createClient())

co(function *(){
    yield client.set('foo', '123')
    yield client.set('bar', '456')

    console.log('get foo:', yield client.get('foo')) // => 123
    console.log('get bar:', yield client.get('bar')) // => 456

    console.log(yield client.quit())
})()
```

## Inspiration

* [thunks](https://github.com/teambition/thunks)
* [thunkify](https://github.com/tj/node-thunkify)

## License

MIT
