# ── Stage 1 : Build ───────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copier pom.xml SEUL en premier → Docker cache cette couche
# Si seul le code change, Maven ne re-télécharge PAS les dépendances
COPY pom.xml .
RUN mvn dependency:go-offline -B --quiet

# Copier le code source et compiler
COPY src ./src
RUN mvn clean package -DskipTests -B --quiet

# ── Stage 2 : Runtime (image finale légère ~100MB) ────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8085

ENTRYPOINT ["java", "-jar", "app.jar"]
