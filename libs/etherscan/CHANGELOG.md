# [2.0.0] (2021-11-27)

### Features

- !BREAKING CHANGE! refactor all methods into classes, this is to allow instances with different config in the same application
- add `bottleneck` library to provide rate limiting per instance. bscscan.com only allows 5 requests per second on the free plan, and is also limited on paid plans. The requests per second limit can be set in config.
- export all interfaces and types for better type checking in your parent project
- add new api method `api.token.getTokenInfoByContractAddress`
- !BREAKING CHANGE! removed requestConfig.rawAxiosRequest, this is to simplify type casting when calling methods. A future release will add this option back in, and try to maintain the simplicity of response types

# [1.2.0](https://github.com/jpgarcia/bsc-scan/compare/v1.1.0...v1.2.0) (2021-06-24)

### Features

- add new api method (force release) ([4088153](https://github.com/jpgarcia/bsc-scan/commit/40881536126b0563ddd346fdba8a7ffa3a0c15ec))

# [1.1.0](https://github.com/jpgarcia/bsc-scan/compare/v1.0.0...v1.1.0) (2021-01-30)

### Bug Fixes

- fix lodash dependencies ([9c5098b](https://github.com/jpgarcia/bsc-scan/commit/9c5098bad567e9cc4a2353eab32d5b0946921619)), closes [#1](https://github.com/jpgarcia/bsc-scan/issues/1)

### Features

- improve api ([48e4d77](https://github.com/jpgarcia/bsc-scan/commit/48e4d77f330926fe048a542e5cade5385d6dddca)), closes [#1](https://github.com/jpgarcia/bsc-scan/issues/1)

# 1.0.0 (2021-01-30)

### Features

- **api:** Initial release ([313badc](https://github.com/jpgarcia/bsc-scan/commit/313badcd6b6bf1f078eb9d95b83263f4eb2213db))
