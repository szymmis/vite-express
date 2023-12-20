# Changelog

## 0.12.0 (2023-12-20)

- Make Vite middleware use current server for HMR WebSocket ([#100](https://github.com/szymmis/vite-express/pull/100))
- Emit event when the Vite dev server has finished closing ([#98](https://github.com/szymmis/vite-express/pull/98))

## 0.11.1 (2023-11-17)

- Mount middlewares that serve HTML at `config.root` instead of `/` ([#91](https://github.com/szymmis/vite-express/pull/91))

## 0.11.0 (2023-10-02)

- Add support for multipage apps ([#88](https://github.com/szymmis/vite-express/pull/88))

## 0.10.0 (2023-08-24)

- Enable resolving config without Vite ([#83](https://github.com/szymmis/vite-express/pull/83))
- Add config option to ignore paths ([#84](https://github.com/szymmis/vite-express/pull/84))

## 0.9.2 (2023-07-21)

- Use export assignment syntax in types declaration ([#74](https://github.com/szymmis/vite-express/pull/73))
- Bump word-wrap from 1.2.3 to 1.2.4 ([#73](https://github.com/szymmis/vite-express/pull/73))
- Bump vite from 4.0.4 to 4.0.5 ([#66](https://github.com/szymmis/vite-express/pull/66))

## 0.9.1 (2023-06-05)

- Load HTML on every request
- Merge custom config with inline Vite's config when starting dev server

## 0.9.0 (2023-06-05)

- Allow specyfing HTML transformer ([#65](https://github.com/szymmis/vite-express/pull/65))
- Implement `viteless` mode ([#64](https://github.com/szymmis/vite-express/pull/64))
- Bump socket.io-parser from 4.2.2 to 4.2.3 ([#61](https://github.com/szymmis/vite-express/pull/61))
- Add Vite base support ([#57](https://github.com/szymmis/vite-express/pull/57))
- Remove `node-fetch` from dependencies

## 0.8.0 (2023-05-19)

- Use `Vite Dev Server` in middleware mode when running in development instead of a proxied separate Vite process
- Temporarily drop support for multi-page apps

## 0.7.1 (2023-05-17)

- Turn off `index.html` serving functionality of `express.static()` middleware in production mode

## 0.7.0 (2023-05-14)

- Add `ViteExpress.static()` middleware-like function to change the order of `vite-express'` injected static files serving middleware.

## 0.6.0 (2023-04-28)

- Stop using redirection to Vite Dev Server when serving static files in dev mode.

## 0.5.5 (2023-04-27)

- Fix inability to set `ViteExpress.config` settings to falsy values
- Bump `yaml` package version to avoid vulnerabilities

## 0.5.4 (2023-04-21)

- Pass request path correctly into HTML serving middleware in dev mode

## 0.5.3 (2023-04-12)

- Make Vite's port not be printed out to console by default.
- Add config option to control that behaviour

## 0.5.2 (2023-04-08)

- Make `picocolors` a runtime dependency instead of peer dependency.

## 0.5.1 (2023-03-24)

- Add `picocolors` as a peer dependency to package.json

## 0.5.0 (2023-03-21)

- Print url schema correctly when Vite is running in https mode
