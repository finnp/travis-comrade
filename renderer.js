var h = require('virtual-dom/h')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var createElement = require('virtual-dom/create-element')
var ipc = require('electron').ipcRenderer
var delegate = require('delegate-dom')
var fuzzy = require('fuzzy')

// require('remote').getCurrentWindow().toggleDevTools()

var data = {
  repos: [],
  syncing: false,
  search: ''
}
function render () {
  var children = [
    h('button', (data.syncing ? 'Syncing...' : 'Sync Travis with GitHub')),
    h('input.search')
  ]

  if (data.repos.length > 0) {
    var repos = data.repos
    if (data.search.length > 0) {
      var results = fuzzy.filter(data.search, repos, {
        extract: function (repo) {
          return repo.name
        }
      })
      repos = results.map(function (r) {
        return r.original
      })
    }

    var repoList = h('ul', repos.map(function (repo, index) {
      return h('li', {key: repo.id}, [
        h('span', [
          h('img', {
            style: {visibility: repo.loading ? 'visible' : 'hidden'},
            src: 'loading.gif'
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
        h('span.repo', repo.owner_name + '/' + repo.name)
      ])
    }))
    children.push(repoList)
  } else {
    children.push(h('img', {
      src: 'loading.gif'
    }))
  }

  return h('div', children)
}

var tree = render()
var rootNode = createElement(tree)
document.body.appendChild(rootNode)

function update () {
  var newTree = render()
  var patches = diff(tree, newTree)
  rootNode = patch(rootNode, patches)
  tree = newTree
}
ipc.on('list', function (event, repos) {
  data.repos = repos
  update()
})

delegate.on(rootNode, 'ul li input', 'change', function (e) {
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

delegate.on(rootNode, 'button', 'click', function (e) {
  data.syncing = true
  update()
  ipc.send('sync')
})
ipc.on('syncdone', function () {
  data.syncing = false
  update()
})

delegate.on(rootNode, 'input.search', 'keyup', function (e) {
  data.search = e.target.value
  update()
})

ipc.send('loaded')
