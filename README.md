# EKP - Earnkeeper Plugins

![Werf Status](https://github.com/EarnKeeper/ekp/actions/workflows/werf-converge/badge.svg)

`ekp` is the plugin system for [earnkeeper.io](https://earnkeeper.io). It allows you to scrape the blockchain for the information you want to see and display it in tables and graphs for everyone.

![screenshot of earnkeeper plugins page](https://raw.githubusercontent.com/EarnKeeper/ekp/feat/docs/docs/images/plugins-page.jpeg)

## Why?

We started [earnkeeper.io](https://earnkeeper.io) to provide unbiased, detailed and honest analysis of projects in the cryptocurrency [Play 2 Earn](https://wiki.rugdoc.io/docs/play-to-earn-games-p2e/) space.

Games are being released in this space very quickly, and we can cover only a very small portion of them. Our community on [Discord](https://discord.gg/XXcuUyehvY) is already brimming with users who love the site and want to help.

We don't want to open source the site itself, as it would be impossible to provide a secure experience to those who trust https://earnkeeper.io showing at the top of their browser.

So instead, we are exposing as much functionality as we possibly can through a websocket specification to any externally hosted webservice.

We love <https://dune.xyz>, it gets low skill users into a place where they can create analytics very quickly. But we got stuck trying to model certain games, it didn't have the power we needed, and its quite difficult to personalize the results to your users.

We are trying to find a way to give developers the power they need for complex analysis, and the flexibility for personalized display results. All while being able to block dangerous interactions with user's wallets.

This repository contains the specification, and a starter project in node.js to get you up and running. Join our [Discord](https://discord.gg/XXcuUyehvY) to get help or information directly!

## Developing

Fork and clone this repository.

It contains a fully functioning plugin, which we actually use on our https://farms.earnkeeper.io subdomain.

We don't want to re-invent the wheel, so we use the following open source libraries and frameworks in our code:

- Typescript
- NestJs
- Socket.io
- TypeORM
- Postgres
- EthersJs
- JsonForms
- Werf
- Docker
- Kubernetes
- Helm
- Grafana Loki
- NocoDB

You are free to use any you like, its your microservice after all! You don't even have to use javascript, it can be python, go, whatever you like behind the scenes. All we specify is a protocol that earnkeeper.io understands.

This project is only intended to get you a start in the language and frameworks that we use ourselves.

We use github to host our code, and github actions to automate our deploys.

To run the example plugin locally...

Create a .env file in the root of the ekp directory:

```
BSCSCAN_API_KEY=
PG_URL=postgres://postgres:postgres@localhost:5432/ekp
```

Append your BSC SCAN api key to the end of the first line, [you can create one here.](https://bscscan.com/myapikey). You will use this key to pull logs from the blockchain.

You will need a postgres database running on your local machine, if your connection details are different for your local instance, you can change them on the second line.

Then run the following to start the app locally.

```sh
cd farms
npm install
npm run start:dev
```

Go to https://playground.earnkeeper.io/plugins, add a new plugin with url: http://localhost:3001.

After clicking save, you should see the same list of farms that you see on the main site!

You can continue to make changes to your local, and these changes will immediately reflect at https://playground.earnkeeper.io.

Once you are ready to share your creation with the world, follow the deploy instructions below, and share the public host name of your provider with users, they will add your plugin in exactly the same way.

Talk to us in Discord about bundling your plugin with the official earnkeeper site, so that everyone has access to it!

## Deploying

🐛 We have an [open issue](https://github.com/EarnKeeper/ekp/issues/1) for developing a command line client to automate the below instructions. Add a thumbs up if you think this will help!

This repository uses kubernetes to host its containers. I use digital ocean, you are free to use any provider you prefer, but I will provide instructions for digital ocean here.

Install the kubectl CLI, [Instructions per platform are here.](https://kubernetes.io/docs/tasks/tools/).

Install the digital ocean `doctl` command line tool and authenticate it with digital ocean. [Instructions per platform are here.](https://docs.digitalocean.com/reference/doctl/how-to/install/).

Run the following command to create your kubernetes cluster and save the authentication details to your machine.

⚠️ Replace `ekp` below with a name of your choice. You will use it to reference the cluster later. In subsequent commands in this guide, do the same replacement.

```sh
doctl kubernetes cluster create ekp --count=1 --size=s-2vcpu-4gb --surge-upgrade=false --1-clicks=ingress-nginx
```

Once the command completes, run the following command to get the public host name of your cluster. You will need it later.

```
doctl kubernetes cluster get ekp --format=Endpoint
```

Unfortunately there is not a good way to automate the install of cert-manager, and you will need it for TLS. So you need to run this command once after your cluster has been created:

```
kubtctl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.6.1/cert-manager.yaml
```

You need your own werf secret key to encrypt any private secrets you keep in your public repository. Generate one with this command:

```sh
werf helm secret generate-secret-key > .werf_secret_key
```

⚠️ By default this file is already ignored in the private .gitignore. DON'T change this behaviour, and DON'T commit .werf_secret_key to git history. It is meant to be private to you.

There are some already encrypted values in this file `.helm/secret-values`. Edit the file and input your own plain text values, the comments will guide you on what to enter. Save the file and then run:

```sh
werf helm secret values encrypt clear-values.yaml -o .helm/secret-values.yaml
```

Your values are now encrypted and safe to commit to git.

The github actions config in the start repo already has everything needed to deploy your app to kubernetes. You just need to configure your git repository and push to the main branch.

If you don't have it already, download and authenticate with the github command line client. [Instructions per platform are here](https://cli.github.com/manual/)

Upload your werf secret key to github, replace `ekp` below with the name of your github repository.

```sh
gh secret set WERF_SECRET_KEY --repos="ekp" < .werf_secret_key
```

Upload your kubernetes auth details to github, replace `ekp` below with the name of your github repository, and then the name of your kubernetes cluster (there are two occurrences of ekp).

```sh
gh secret set KUBE_CONFIG_BASE64_DATA --repos="ekp" -b$(doctl kubernetes cluster kubeconfig show ekp | base64)
```

You are all set, go ahead and push your changes to your repository. Once the build is complete, your plugin is available on websockets at your EndPoint address you received above!

This is the url you will enter into the EarnKeeper website to enable your plugin.
