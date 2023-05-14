# Changelog

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
