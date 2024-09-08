FROM node:19-alpine as build
RUN apk --update add postgresql-client

RUN apk --update add postgresql-client

RUN mkdir /api

WORKDIR /api

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:19-alpine
RUN apk --update add postgresql-client
RUN apk update && apk add  openssh-server

RUN mkdir /api

WORKDIR /api

COPY --chown=node:node --from=build /api/dist ./dist
COPY --chown=node:node --from=build /api/prisma ./prisma
COPY --chown=node:node --from=build /api/package*.json ./
COPY --chown=node:node --from=build /api/banks.json ./

RUN npm install --omit=dev

RUN npx prisma generate

EXPOSE 3000
# RUN service ssh start

CMD ["npm run migrate:deploy && npm run seed:prod && npm run start:prod"]