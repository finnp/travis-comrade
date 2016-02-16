var h = require('virtual-dom/h')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var createElement = require('virtual-dom/create-element')
var ipc = require('electron').ipcRenderer
var delegate = require('delegate-dom')

require('remote').getCurrentWindow().toggleDevTools()

var data = {
  repos: [],
  syncing: false
}
function render () {
  var repos = data.repos
  return h('div', [
    h('button', (data.syncing ? 'Syncing...' : 'Sync Travis with GitHub.')),
    h('ul', repos.map(function (repo, index) {
      return h('li', [
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
  ])
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

ipc.send('loaded')

delegate.on(rootNode, 'button', 'click', function (e) {
  data.syncing = true
  update()
  ipc.send('sync')
})
ipc.on('syncdone', function () {
  data.syncing = false
  update()
})
