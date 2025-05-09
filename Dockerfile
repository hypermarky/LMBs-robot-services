# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
# Use --omit=dev for production if your start script doesn't need dev deps
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Your bot's .env file will be passed as environment variables to the container instance
# So, ensure your bot reads from process.env

# Command to run your bot
CMD [ "node", "-r", "dotenv/config", "index.js" ]
# Or if dotenv is baked into your start script in package.json:
# CMD [ "npm", "start" ]