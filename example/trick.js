
var thunk = require('..')

function isAvailable(thunk) {
    var ready = false
    thunk(function () {
        ready = true
    })
    return ready
}

var th_0 = thunk(function (cb) {
    cb() // callback immediately
})

var th_1 = thunk(function (cb) {
    setTimeout(cb, 1000) // callback after 1 second
})

console.log(isAvailable(th_0)) // => true
console.log(isAvailable(th_1)) // => false
