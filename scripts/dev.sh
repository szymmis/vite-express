#!/usr/bin/env bash
npm link
cd examples/"${1:-basic-app}"
npm link vite-express
yarn dev -w ../../dist
