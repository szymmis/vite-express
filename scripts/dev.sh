#!/usr/bin/env bash
npm link
cd examples/"${1:-react-app}"
npm link vite-express
yarn dev -w ../../dist
