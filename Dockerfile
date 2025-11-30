FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run prisma:generate

RUN npm run build

RUN npm run prisma:migrate

EXPOSE 3000

CMD ["npm", "start"]
