# Pro DB kit

![ProDB-kit Logo](https://github.com/pesto-students/n8-prodbkit-epsilon-8/blob/feature/update-static-content/src/assets/database-icon.svg)

Pro DB kit enables teams to manage database access without involving DB Admins / Devops / IT teams. It allows developers and their managers ( Team Lead, Engineering Managers etc. ) to grant access to the databases they have access to without any intervention from any of the teams administering databases.
<br/>
The goal is to reduce the dependency on Devops / IT teams for granting access to databases and thus enabling them to channelise their energies to more productive tasks at the same time the developers can get access to the systems they need to without going through the vicious cycle of approvals and escalations.

<br/>

# Table of Contents

1. [Demo](#demo)
2. [Technology Stack](#technology-stack) 
3. [Installation](#installation) 
4. [Authors](#authors)
5. [License](#license)

<br/>

# Demo

The Swagger UI for the APIs can be accessed [here](http://ec2-13-232-176-94.ap-south-1.compute.amazonaws.com:3000/api/)

The CI CD Deployment can be accessed [here](http://ec2-13-232-176-94.ap-south-1.compute.amazonaws.com:8080)

The Slack notifications are being delivered in our private slack channel :

![slack notification](https://ik.imagekit.io/cbe92xj3y66/tr:w-0.5/Screenshot_2021-10-31_at_12.23.37_PM__KbbJUQS66f.png)

<br/>

# Technology Stack
We tried to use a completely modern tech stack while testing out some new technologies that we had never used before. This resulted in a fast, performant, and easily-extensible web app that should be fairly future-proof for the coming next several years. We have used NestJS & Typescript for our development.

In order to run the project, you will need the following node, npm & nest js cli versions :

```
node     : v12.22.1
npm      : 6.14.12
nest cli : 8.1.2
```

# Installation

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

# Authors

- [Saurav Arora](https://github.com/sauravarora041294)
- [Abhishek Khanna](https://github.com/assaultkoder95)

<br/>

# License

[MIT](https://opensource.org/licenses/MIT)
