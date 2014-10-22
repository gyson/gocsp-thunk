
var thunk = require('..')

var fs = thunk.ifyAll(require('fs'))

fs.readFile(__filename, 'utf8')(function (err, val) {
    if (err) { throw err }
    console.log(val)
})
