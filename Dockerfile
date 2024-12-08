FROM node:lts-alpine

WORKDIR /src

COPY package.json package-lock.json ./

RUN npm ci --prod

FROM node:lts-alpine

WORKDIR /src
COPY --from=0 /src .
COPY src .
CMD ["node", "server.js"]
