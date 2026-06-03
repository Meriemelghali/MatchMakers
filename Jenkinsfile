pipeline {
    agent any
    tools {
        jdk 'JAVA_HOME' // Assurez-vous que JDK 17 est configuré dans Jenkins sous ce nom
        maven 'M2_HOME' // Assurez-vous que Maven est configuré
        nodejs 'NODE_HOME' // Assurez-vous que Node.js est configuré si vous voulez builder le frontend
    }
    environment {
        BACKEND_SERVICES = 'EventCompetitionService MatchService ProductService ReclamationService ReservationService RewardService SocialService SponsorService SportService TeamService TerrainService UserService'
        FRONTEND_DIR = 'Frontend'
        DOCKER_REGISTRY_PREFIX = 'matchmakers'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [
                        [$class: 'CloneOption', 
                         timeout: 60, 
                         shallow: true,
                         depth: 1,
                         noTags: true]
                    ],
                           userRemoteConfigs: [[url: 'https://github.com/Meriemelghali/MatchMakers']]
                ])
            }
        }
        stage('Backend Compile') {
            steps {
                script {
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh 'mvn clean compile'
                        }
                    }
                }
            }
        }
        stage('Backend Test') {
            steps {
                script {
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh 'mvn test'
                        }
                    }
                }
            }
        }
        stage('Backend Package') {
            steps {
                script {
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh 'mvn package -DskipTests'
                        }
                    }
                }
            }
        }
        stage('Frontend Install') {
            steps {
                dir(env.FRONTEND_DIR) {
                    sh 'npm ci'
                }
            }
        }
        stage('Frontend Test') {
            steps {
                dir(env.FRONTEND_DIR) {
                    sh 'npm run test -- --watch=false --browsers=ChromeHeadless'
                }
            }
        }
        stage('Frontend Build') {
            steps {
                dir(env.FRONTEND_DIR) {
                    sh 'npm run build'
                }
            }
        }
        stage('Build Docker Images') {
            steps {
                script {
                    sh 'eval $(minikube docker-env) || true'
                    for (service in env.BACKEND_SERVICES.tokenize(' ')) {
                        dir("Backend/${service}") {
                            sh "docker build --no-cache -t ${env.DOCKER_REGISTRY_PREFIX}-${service.toLowerCase()}:latest ."
                        }
                    }
                    dir(env.FRONTEND_DIR) {
                        sh "docker build --no-cache -t ${env.DOCKER_REGISTRY_PREFIX}-frontend:latest ."
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker compose down --remove-orphans || true'
                sh 'docker compose up -d --no-build \
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
                    frontend'
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
