pipeline {
    agent any
    tools {
        jdk 'JAVA_HOME' // Assurez-vous que JDK 17 est configuré dans Jenkins sous ce nom
        maven 'M2_HOME' // Assurez-vous que Maven est configuré
    }
    environment {
        // Définition des variables pour les images Docker
        RESERVATION_IMAGE = 'matchmakers-reservation-service:latest'
        SOCIAL_IMAGE = 'matchmakers-social-service:latest'
    }
    stages {
        stage('GIT') {
            steps {
                // Mettez l'URL correcte de votre dépôt GitHub pi_2026
                git branch: 'main',
                    url: 'https://github.com/Meriemelghali/MatchMakers' 
            }
        }
        stage('Compile') {
            steps {
                // Compilation pour ReservationService
                dir('Backend/ReservationService') {
                    sh 'mvn clean compile'
                }
                // Compilation pour SocialService
                dir('Backend/SocialService') {
                    sh 'mvn clean compile'
                }
            }
        }
        stage('Test') {
            steps {
                dir('Backend/ReservationService') {
                    sh 'mvn test -DskipTests'
                }
                dir('Backend/SocialService') {
                    sh 'mvn test -DskipTests'
                }
            }
        }
        stage('Package') {
            steps {
                dir('Backend/ReservationService') {
                    sh 'mvn package -DskipTests'
                }
                dir('Backend/SocialService') {
                    sh 'mvn package -DskipTests'
                }
            }
        }
        stage('SonarQube') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    dir('Backend/ReservationService') {
                        sh 'mvn sonar:sonar -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$SONAR_TOKEN -Dsonar.projectKey=ReservationService'
                    }
                    dir('Backend/SocialService') {
                        sh 'mvn sonar:sonar -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$SONAR_TOKEN -Dsonar.projectKey=SocialService'
                    }
                }
            }
        }
        stage('Build Docker Images') {
            steps {
                // IMPORTANT : Si vous utilisez Minikube localement, cette ligne indique à Docker de construire 
                // l'image DIRECTEMENT dans le Docker interne de Minikube (pour qu'elle soit trouvée lors du déploiement).
                sh 'eval $(minikube docker-env)'
                
                dir('Backend/ReservationService') {
                    sh "docker build --no-cache -t ${RESERVATION_IMAGE} ."
                }
                dir('Backend/SocialService') {
                    sh "docker build --no-cache -t ${SOCIAL_IMAGE} ."
                }
            }
        }
        stage('Deploy') {
            steps {
                // On utilise kubectl pour déployer sur Minikube
                sh 'kubectl apply -f k8s/reservation-deployment.yaml'
                sh 'kubectl apply -f k8s/social-deployment.yaml'
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
