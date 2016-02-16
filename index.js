var menubar = require('menubar')
var path = require('path')
var request = require('request')
var electron = require('electron')
var ipc = electron.ipcMain
var dialog = electron.dialog

var mb = menubar({
  dir: __dirname,
  icon: path.join(__dirname, 'travis-inactive.png')
})

var travisToken = process.env['TRAVIS_TOKEN']

mb.on('ready', function () {
  var travisHeaders = {
    'Accept': 'application/vnd.travis-ci.2+json',
    'Authorization': 'token ' + travisToken,
    'User-Agent': 'travis-girder'
  }
  var reposReq = {
    url: 'https://api.travis-ci.org/hooks?all=true&owner_name=finnp',
    headers: travisHeaders,
    json: true
  }
  ipc.on('toggle', function (event, repoId, checked) {
    var hookReq = {
      url: 'https://api.travis-ci.org/hooks/' + repoId,
      headers: travisHeaders,
      body: {
        hook: {
          active: checked
        }
      },
      json: true
    }
    request.put(hookReq, function (err, res, body) {
      if (err) dialog.showErrorBox('error', err.message)
      event.sender.send('stopload', repoId)
    })
  })
  ipc.on('loaded', function (event) {
    console.log('load')
    request.get(reposReq, function (err, res, body) {
      if (err) dialog.showErrorBox('error', err.message)
      console.log('send hooks')
      event.sender.send('list', body.hooks)
    })
  })
  ipc.on('debug', function (event, log) {
    console.log(log)
  })
  ipc.on('sync', function (event) {
    mb.tray.setImage(path.join(__dirname, 'travis.png'))
    var syncReq = {
      url: 'https://api.travis-ci.org/users/sync',
      headers: travisHeaders
    }
    request.post(syncReq, function (err, res, body) {
      if (err) return dialog.showErrorBox('error', err.message)
      var loopReq = {
        url: 'https://api.travis-ci.org/users',
        headers: travisHeaders,
        json: true
      }
      function loopWhileSync () {
        request.get(loopReq, function (err, res, body) {
          if (!err && body.user.is_syncing) return loopWhileSync()
          mb.tray.setImage(path.join(__dirname, 'travis-inactive.png'))
          event.sender.send('syncdone')
        })
      }
      loopWhileSync()
    })
  })
})

//
// function getToken (githubToken) {
//   var opts = {
//     url: 'https://api.travis-ci.org/auth/github',
//     headers: {
//       'User-Agent': 'Oghliner',
//       'Accept': 'application/vnd.travis-ci.2+json'
//     },
//     body: {
//       'github_token': githubToken
//     },
//     method: 'POST',
//     json: true
//   }
//   console.log('req')
//   request(opts, function (err, res, body) {
//     if (err) return dialog.showErrorBox('error', err.message)
//     console.log(res.statusCode)
//     console.log(body)
//   })
// }
