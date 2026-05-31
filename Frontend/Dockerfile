# Étape 1 : Build de l'application Angular
FROM node:18-alpine AS build
WORKDIR /app

# Copie des fichiers package.json et package-lock.json
COPY package*.json ./

# Installation des dépendances avec gestion des conflits potentiels
RUN npm install --legacy-peer-deps

# Copie du reste du code source
COPY . .

# Build de production
RUN npm run build -- --configuration=production

# Étape 2 : Serveur de fichiers statiques (sans Nginx)
FROM node:18-alpine

# Installation du package 'serve' pour servir les fichiers statiques
RUN npm install -g serve

# Copie des fichiers compilés depuis l'étape de build
COPY --from=build /app/dist/frontend /app

EXPOSE 4200

CMD ["serve", "-s", "/app", "-l", "4200"]
