var menubar = require('menubar')
var path = require('path')
var request = require('request')
var electron = require('electron')
var defaultMenu = require('electron-default-menu')
var fs = require('fs')
var ipc = electron.ipcMain
var dialog = electron.dialog
var app = electron.app
var Menu = electron.Menu

var mb = menubar({
  dir: __dirname,
  icon: path.join(__dirname, 'travis-inactive.png')
})

var configFile = path.join(app.getPath('userData'), 'config.json')

var renderer

mb.on('ready', function () {
  // the menu is needed for copy-paste to work on osx
  var menu = Menu.buildFromTemplate(defaultMenu())
  Menu.setApplicationMenu(menu)

  ipc.on('loaded', function (event) {
    renderer = event.sender // can you get this another way?
    ready()
  })
})

function ready () {
  var config = {}
  try {
    config = JSON.parse(fs.readFileSync(configFile))
  } catch (e) {}

  var travisToken = config.travisToken
  if (!travisToken) {
    renderer.send('login')
    ipc.on('githubkey', function (e, key) {
      getToken(key)
    })
    return
  }

  var travisHeaders = {
    'Accept': 'application/vnd.travis-ci.2+json',
    'Authorization': 'token ' + travisToken,
    'User-Agent': 'travis-girder'
  }

  function getRepos () {
    var reposReq = {
      url: 'https://api.travis-ci.org/hooks?all=true&owner_name=finnp',
      headers: travisHeaders,
      json: true
    }
    request.get(reposReq, function (err, res, body) {
      if (err) dialog.showErrorBox('error', err.message)
      renderer.send('list', body.hooks)
    })
  }

  getRepos()

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
          getRepos()
          event.sender.send('syncdone')
        })
      }
      loopWhileSync()
    })
  })
}

ipc.on('logout', function () {
  fs.unlink(configFile, function () {
    renderer.send('login')
  })
})

function getToken (githubToken) {
  var opts = {
    url: 'https://api.travis-ci.org/auth/github',
    headers: {
      'User-Agent': 'Oghliner',
      'Accept': 'application/vnd.travis-ci.2+json'
    },
    body: {
      'github_token': githubToken
    },
    method: 'POST',
    json: true
  }
  request(opts, function (err, res, body) {
    if (res.statusCode !== 200) err = new Error(body)
    if (err) return dialog.showErrorBox('Login failed', err.message)
    var config = {
      travisToken: body.access_token
    }
    fs.writeFile(configFile, JSON.stringify(config), function () {
      ready()
    })
  })
}
