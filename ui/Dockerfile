FROM node:lts-alpine

WORKDIR /src

COPY package.json package-lock.json ./

RUN npm i

COPY . ./

# RUN npm run build

CMD ["npm", "run", "dev"]
