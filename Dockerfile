FROM node:16-alpine

WORKDIR /src

COPY package.json package-lock.json ./

RUN npm ci --prod

FROM node:16-alpine

WORKDIR /src
COPY --from=0 /src .
COPY src .
CMD ["node", "server.js"]
