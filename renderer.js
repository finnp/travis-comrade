var h = require('virtual-dom/h')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var createElement = require('virtual-dom/create-element')
var electron = require('electron')
var ipc = electron.ipcRenderer
var shell = electron.shell
var delegate = require('delegate-dom')
var fuzzy = require('fuzzy')
var path = require('path')

// require('remote').getCurrentWindow().toggleDevTools()

var loadingGif = path.join(__dirname, 'img', 'loading.gif')

var data = {
  repos: [],
  syncing: false,
  search: ''
}

function renderLogin () {
  return h('div.login', {key: 'login'}, [
    h('h2', 'GitHub token'),
    h('div', [
      'Provide a ',
      h('a', {href: 'https://github.com/settings/tokens', target: '_blank'}, 'Github access token'),
      ' to continue'
    ]),
    h('input.github'),
    h('footer', [
      h('button.quit', 'Quit'),
      h('button.save', 'Save')
    ])
  ])
}

function render () {
  var children = [
    h('header', [
      h('button.sync', (data.syncing ? 'Syncing...' : 'Sync Travis with GitHub')),
      h('input.search')
    ])
  ]

  if (data.repos.length > 0) {
    var repos = data.repos
    if (data.search.length > 0) {
      var results = fuzzy.filter(data.search, repos, {
        extract: function (repo) {
          return repo.owner_name + '/' + repo.name
        }
      })
      repos = results.map(function (r) {
        return r.original
      })
    }

    var repoList = h('ul', repos.map(function (repo, index) {
      var slug = repo.owner_name + '/' + repo.name
      return h('li', {key: repo.id}, [
        h('span', [
          h('img.loading', {
            style: {visibility: repo.loading ? 'visible' : 'hidden'},
            src: loadingGif
          })
        ]),
        h('input.tgl', {
          id: repo.id,
          type: 'checkbox',
          checked: repo.active
        }),
        h('label.tgl-btn', {
          htmlFor: repo.id
        }),
        h('span.repo',
          h('a', {href: 'https://travis-ci.org/' + slug}, slug)
        )
      ])
    }))
    children.push(repoList)
  } else {
    children.push(h('img.loading', {
      src: loadingGif
    }))
  }

  children.push(h('footer', [
    h('button.quit', 'Quit'),
    h('button.logout', 'Logout')
  ]))

  return h('div', {key: 'main'}, children)
}

var tree = render()
var rootNode = createElement(tree)
document.body.appendChild(rootNode)

function update (renderFn) {
  var newTree = renderFn ? renderFn() : render()
  var patches = diff(tree, newTree)
  rootNode = patch(rootNode, patches)
  tree = newTree
}
ipc.on('list', function (event, repos) {
  data.repos = repos
  update()
})
ipc.on('login', function () {
  update(renderLogin)
})

delegate.on(document, 'ul li input', 'change', function (e) {
  var repoId = Number(e.target.id)
  var repo = data.repos.find(function (repo) {
    return repoId === repo.id
  })
  repo.loading = true
  update()
  ipc.send('toggle', repoId, e.target.checked)
})

ipc.on('stopload', function (e, repoId) {
  var repo = data.repos.find(function (repo) {
    return repoId === repo.id
  })
  repo.loading = false
  update()
})

delegate.on(document, 'button.sync', 'click', function (e) {
  data.syncing = true
  update()
  ipc.send('sync')
})
ipc.on('syncdone', function () {
  data.syncing = false
  update()
})

delegate.on(document, 'input.search', 'keyup', function (e) {
  data.search = e.target.value
  update()
})

delegate.on(document, 'button.save', 'click', function (e) {
  ipc.send('githubkey', document.querySelector('.github').value)
})

delegate.on(document, 'button.logout', 'click', function () {
  ipc.send('logout')
})

delegate.on(document, 'a', 'click', function (e) {
  e.preventDefault()
  shell.openExternal(e.target.href)
})

delegate.on(document, 'button.quit', 'click', function () {
  ipc.send('quit')
})

ipc.send('loaded')
