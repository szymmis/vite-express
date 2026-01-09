if [ -z "$1" ]; then
  echo "Must specify version: [patch|minor|major]"
  exit 1
fi

npm version -m "Release v%s" --tag-version-prefix="v" $1
git push && git push --tags
