FROM node:20.11.0-alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY app/package*.json .
RUN npm install

COPY app .

EXPOSE 3000
ENTRYPOINT [ "/app/entrypoint.sh", "start" ]
