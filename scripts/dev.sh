#!/usr/bin/env bash
npm link
cd create-vite-express/templates/"${1:-react}"
npm link vite-express
yarn dev -w ../../../dist
