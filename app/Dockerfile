FROM node:16

WORKDIR /app 

COPY package.json /app 
COPY package-lock.json /app

RUN npm ci 

COPY . /app 

RUN npm run build

CMD ["npm","run","start:prod"]