# travis-comrade ![Travis Comrade](img/travis-inactive.png)

![Screenshot](img/screenshot.png)

Menubar application for synchronizing and activating GitHub repositories on [Travis](https://travis-ci.org).

To download the latest version visit the [releases page](https://github.com/finnp/travis-comrade/releases).

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)


## Create a new release

Make sure you have a GitHub token (`$GH_TOKEN`) in your environment.

```
npm version <patch|minor|major>
git push origin master
npm run build
npm run zip
npm run release // this will prompt you for the release notes
```


This project inofficial and not affiliated with Travis CI GmbH.
