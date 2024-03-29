# yup

A `yarn upgrade` that works.

![yup](https://media.giphy.com/media/3sZlRwZfxAI8g/source.gif)

### How to use

- Install globally with `npm install -g @azcn2503/yup`
- From your repository: `yup package-name`
- To update multiple packages: `yup package-name-1 package-name-2`

### How it works

`yup` reads your `package.json` to pick out the version string, and instead of doing a `yarn upgrade -P package-name` swaps this out for something like: `yarn remove package-name && yarn add --dev package-name@3.2.1` which I have discovered is far more reliable.

`yup` will make a backup of your `package.json` and `yarn.lock` files before making changes, and roll them back if anything fails or if the command is cancelled.

#### Example

- You run `yup my-great-package`
- Yup checks where this exists in your package.json dependencies (either in `dependencies` or `devDependencies`).
- Yup checks the version of the package; this supports semantic version strings, branch names, git tags, etc.
- Yup builds and runs a command to re-add the package at the specified version, which bumps the yarn.lock resolved version of the package.
