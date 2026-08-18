# Multi-stage build: compile with Maven, run on a slim JRE.
# Railway (and most PaaS platforms) auto-detect this file and use it directly -
# no build command to configure by hand.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
# Dependencies first, so a code-only change doesn't re-download the internet.
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/prediction-market-backend-*.jar app.jar

# Railway sets PORT itself; application-prod.properties reads it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
