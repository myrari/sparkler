FROM node:24-alpine

RUN npm install -g typescript

USER node

WORKDIR /home/node/app

RUN npm run build

ENTRYPOINT [ "npm", "run", "start" ]