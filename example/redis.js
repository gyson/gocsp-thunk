
var thunk = require('..')
var redis = require('redis')
var go = require('gocsp-go')

var client = thunk.ifyAll(redis.createClient())

go(function *(){
    yield client.set('foo', '123')
    yield client.set('bar', '456')

    console.log('get foo:', yield client.get('foo'))
    console.log('get bar:', yield client.get('bar'))

    console.log(yield client.quit())
})
