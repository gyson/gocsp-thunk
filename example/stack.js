
var go = require('gocsp-go')
var thunk = require('..')

var read = thunk.ify(require('fs').readFile)

go(function* top() {
    try {
        yield setImmediate // do something async
        yield go(function* inner() {
            yield setImmediate // do something async
            yield read('no exists')
        })
    } catch (e) {
        console.log(e.stack)
    }
})

// $ node --harmony example/stack.js --gocsp-thunk-debug 1
// Error: ENOENT, open 'no exists'
//     at Error (native)
// ----
//     at inner (/Users/yunsong/Projects/node_modules/gocsp-thunk/example/stack.js:12:19)
// ----
//     at top (/Users/yunsong/Projects/node_modules/gocsp-thunk/example/stack.js:10:15)
