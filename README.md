# yup

A `yarn upgrade` that works.

![yup](https://media.giphy.com/media/3sZlRwZfxAI8g/source.gif)

### How to use

- Install globally with `npm install -g @azcn2503/yup`
- From your repository: `yup package-name`
- To update multiple packages: `yup package-name-1 package-name-2`

### How it works

`yup` reads your `package.json` to pick out the version string, and instead of doing a `yarn upgrade -P package-name` swaps this out for something like: `yarn add --dev package-name@3.2.1` which I have discovered is far more reliable.
