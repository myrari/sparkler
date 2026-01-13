FROM node:24-alpine

RUN npm install -g typescript

USER node

COPY --chown=node . /home/node/app/
WORKDIR /home/node/app

RUN npm install

RUN npm run build

ENTRYPOINT [ "npm", "run", "start" ]