pipeline {
    agent any
    tools {
        jdk 'JAVA_HOME'
        maven 'M2_HOME'
        nodejs 'NODE_HOME'
    }
    environment {
        BACKEND_SERVICES = 'EventCompetitionService MatchService ProductService ReclamationService ReservationService RewardService SocialService SponsorService SportService TeamService TerrainService UserService'
        FRONTEND_DIR = 'Frontend'
        DOCKER_REGISTRY_PREFIX = 'matchmakers'
    }
    stages {
        stage('GIT') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [[$class: 'CloneOption', timeout: 60, shallow: true, depth: 1, noTags: true]],
                    userRemoteConfigs: [[url: 'https://github.com/Meriemelghali/MatchMakers']]
                ])
            }
        }
        stage('Backend Build') {
            steps {
                script {
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh 'mvn clean package -DskipTests'
                        }
                    }
                }
            }
        }
        stage('SonarQube') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    script {
                        for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                            dir("Backend/${service}") {
                                sh "mvn sonar:sonar -Dsonar.projectKey=matchmakers-${service.toLowerCase()} -Dsonar.host.url=http://localhost:9000 -Dsonar.token=\$SONAR_TOKEN"
                            }
                        }
                    }
                }
            }
        }
        stage('Frontend') {
            steps {
                dir(env.FRONTEND_DIR) {
                    sh 'npm ci && npm run build'
                }
            }
        }
        stage('Build Docker Images') {
            steps {
                script {
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh "docker build -t ${env.DOCKER_REGISTRY_PREFIX}-${service.toLowerCase()}:latest ."
                        }
                    }
                    dir(env.FRONTEND_DIR) {
                        sh "docker build -t ${env.DOCKER_REGISTRY_PREFIX}-frontend:latest ."
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker compose down --remove-orphans || true'
                sh '''docker compose up -d \
                    mongo \
                    user-service \
                    reclamation-service \
                    event-competition-service \
                    sport-service \
                    team-service \
                    reward-service \
                    match-service \
                    terrain-service \
                    reservation-service \
                    social-service \
                    sponsor-service \
                    product-service \
                    frontend'''
            }
        }
        stage('Monitoring') {
            steps {
                sh 'docker start prometheus grafana || echo "Prometheus/Grafana non démarrés"'
            }
        }
    }
    post {
        success {
            emailext(
                to: 'moussayoussef65@gmail.com',
                subject: "✅ Build SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Le pipeline ${env.JOB_NAME} #${env.BUILD_NUMBER} a réussi pour MatchMakers !"
            )
        }
        failure {
            emailext(
                to: 'moussayoussef65@gmail.com',
                subject: "❌ Build FAILURE: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Le pipeline ${env.JOB_NAME} #${env.BUILD_NUMBER} a échoué pour MatchMakers !"
            )
        }
    }
}