# Use an official Node.js runtime as the base image
FROM node:14-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install application dependencies
RUN npm install

# Bundle your application source code inside the Docker image
COPY . .

# Expose the port that your application will run on
EXPOSE 3000

# Define the command to run your Node.js application
CMD ["npm", "start"]
