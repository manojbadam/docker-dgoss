FROM mhart/alpine-node:10.16

COPY server.js /app/
COPY package.json /app/
WORKDIR  /app

RUN npm install

EXPOSE 3000

CMD ["node", "/app/server.js"]