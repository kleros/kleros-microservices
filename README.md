<p align="center">
  <b style="font-size: 32px;">Kleros Microservices</b>
</p>

<p align="center">
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://travis-ci.org/kleros/kleros-microservices"><img src="https://travis-ci.org/kleros/kleros-microservices.svg?branch=master" alt="Build Status"></a>
  <a href="https://david-dm.org/kleros/kleros-microservices"><img src="https://david-dm.org/kleros/kleros-microservices.svg" alt="Dependencies"></a>
  <a href="https://david-dm.org/kleros/kleros-microservices?type=dev"><img src="https://david-dm.org/kleros/kleros-microservices/dev-status.svg" alt="Dev Dependencies"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
</p>

Collection of Kleros microservices.

## Deploying a new microservice

1) Add your service to `serverless.yml`.

2) Get AWS credentials from dashboard and set environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

3) `yarn build` to rebuild problematic dependencies with docker.

4) `yarn deploy:staging` will deploy your new staging microservice for you to test with. `yarn deploy:function <NEW_SERVICE>` can be used after it has been deployed a first time to re-deploy just your function.

5) `yarn deploy` will create a production microservice once you are happy with your staged function.
