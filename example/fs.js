
var thunk = require('..')
var go = requrie('gocsp-go')

var fs = thunk.ifyAll(require('fs'))

go(function* () {

    yield fs.readFile(__filename, 'utf8')

})
