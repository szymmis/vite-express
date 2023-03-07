npm version -m "Release v%s" --tag-version-prefix="v" $1
git push && git push --tags
