FROM node:22-alpine AS builder

ARG LITE=false

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN if [ "$LITE" = "true" ]; then \
      npm run build:lite; \
    else \
      npm run prisma:generate && npm run build; \
    fi

FROM node:22-alpine

ARG LITE=false
ENV LITE=$LITE

WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000

CMD ["/bin/sh", "-c", "if [ \"$LITE\" = \"true\" ]; then npm start; else npx prisma migrate deploy && npm start; fi"]
