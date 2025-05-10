FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev

# Bundle app source
COPY . .


CMD [ "node", "-r", "dotenv/config", "index.js" ]
