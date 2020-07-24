#!/bin/sh

yarn build
cp -r dist/* staging/
cd staging 
git add .
git commit -m "Build for staging"
git push