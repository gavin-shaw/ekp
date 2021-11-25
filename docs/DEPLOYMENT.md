# Deployment

This application supports deployment to any platform that supports node.js and postgres.

I provide examples below for Heroku and Kubernetes on Digital Ocean.

When first developing and testing your plugin, I suggest you use heroku as it is quicker to setup (it does not require your own hostname in particular). Heroku does not scale very well though (read, expensive), once your plugin is expecting to handle more than a few users, I suggest switching to kubernetes.

You can use any kubernetes provider, I just find the Digital Ocean the easiest to use and inexpensive.

## Heroku

Sign up for an account on Heroku, download the commmand line interface and authenticate it using the instructions [here](https://devcenter.heroku.com/articles/heroku-cli).

Create a heroku app from your app directory (make sure to replace the app name below with your own):

```
cd farms
heroku create ekp-farms
```

Add the postgres addon:

```
heroku addons:create heroku-postgresql:hobby-dev
```

NOTE, the hobby-dev postgres plan only allows 10,000 rows in your database. The farms example will deplete this very quickly, for $9 (at time of writing) you can use the next plan level for 10,000,000 rows:

```
heroku addons:create heroku-postgresql:hobby-basic
```

Set your BSCSCAN api key with:

```
heroku config:set BSCSCAN_API_KEY=<your api key here>
```

## Kubernetes on Digital Ocean

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
