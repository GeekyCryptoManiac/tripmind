FROM node:20-slim

WORKDIR /app

# Install deps first
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]