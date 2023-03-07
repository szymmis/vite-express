if [ "$(echo $(git diff HEAD --stat))" != '' ]; then
  echo -e "\u001b[31mGit working directory is not clean!"
  exit 1
fi

cd create-vite-express
VERSION="$(npm version --tag-version-prefix="cli-v" $1)"
git add --all
git commit -m "Release $VERSION" 
git tag "$VERSION"
git push && git push --tags
