
# gocsp-thunk

Thunk as a compatible alternative to Promise

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
### `new Promise( thunk_function )`

Convert a thunk function into a Promise instance

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
into one which returns a thunk

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

    console.log('get foo:', yield client.get('foo'))
    console.log('get bar:', yield client.get('bar'))

    console.log(yield client.quit())
})()
```

## Inspiration

* [thunks](https://github.com/teambition/thunks)
* [thunkify](https://github.com/tj/node-thunkify)
* [promise](https://github.com/domenic/promises-unwrapping)
* [bluebird](https://github.com/petkaantonov/bluebird)
