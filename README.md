# Pro DB Kit - Backend Repo

This repository contains the backend code for Pro DB Kit project.

The project was earlier managed in another repository which can be accessed here : https://github.com/AssaultKoder95/dbacs-backend

## Tech Stack

The project is built with NestJS & Typescript.

In order to run the project, you will need the following node, npm & nest js cli versions :

```
node     : v12.22.1
npm      : 6.14.12
nest cli : 8.1.2
```

## Installing dependencies & How to run the project ?

The project depends upon Postgres SQL for database along with various Node dependencies.

You can install Postgres SQL [here](https://www.postgresql.org/download/).

Other dependencies can be installed via simple `npm install` command.

We also need to update the environment variables as well. A sample .env file is included [here](https://github.com/pesto-students/n8-prodbkit-service-epsilon-8/blob/master/.env.sample).

The fields with `DB_` relate the specific settings you can update from your Postgres SQL installation while the ones with `GOOGLE_` ones are for activating Sign Via Google functionality. An Oauth configured google app will be able to provide you these details.

```bash
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_NAME=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Project Details

This section gives you insight about the APIs that are part of our project.

The API endpoints can be accessed here : http://13.127.49.144:3000/api/#/

The CI CD Deployment can be accessed here : http://13.127.49.144:8080/job/dbacs-backend/

The Slack notifications are being delivered in our private slack channel :

![slack notification](https://ik.imagekit.io/cbe92xj3y66/Screenshot_2021-10-31_at_12.23.37_PM__KbbJUQS66f.png)

## Future Scope

This section gives you insight about the future of our project.
