# Cedar Code Generator

Cedar code generator is a monorepo, which includes the packages used for generating code, matching a cedar schema.

## Disclaimer

This is still in a very early state. You can therefore expect heavy changes in the way it's configured and is working, as well as it's output. Once the first major release comes out, this is no longer going to be the case.  
This project and all it's packages is following the [semver](https://semver.org/) convention, and is managed by [changesets](https://github.com/changesets/changesets).

## Usage

1. You can get started using this library by installing it in your package.json:

```shell
$ npm i -D @cedar-codegen/cli
```

2. Next create a configuration file named `.cedarrc.yml`, it could also be named in any of the formats listed by [cosmiconfig]()

## Future

Feel free to check out the `projects` tab, to see in-progress and future work.

### License

![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)

MIT

### Inspirations

- [graphql-code-generator](https://the-guild.dev/graphql/codegen) has been a huge inspiration in writing this.
