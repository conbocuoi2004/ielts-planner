pipeline {
    agent any

    environment {
        HARBOR   = "registry.conraddesign.uk"
        PROJECT  = "ielts"
        IMAGE    = "ielts-planner"
        FULL     = "${HARBOR}/${PROJECT}/${IMAGE}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $FULL:$BUILD_NUMBER -t $FULL:latest .'
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                  docker rm -f ielts-test 2>/dev/null || true
                  docker run -d --name ielts-test $FULL:$BUILD_NUMBER
                  sleep 3
                  docker exec ielts-test wget -qO- http://localhost:5000/health
                  docker rm -f ielts-test
                '''
            }
        }

        stage('Push to Harbor') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'harbor-cred',
                    usernameVariable: 'HUSER',
                    passwordVariable: 'HPASS'
                )]) {
                    sh '''
                      echo "$HPASS" | docker login $HARBOR -u "$HUSER" --password-stdin
                      docker push $FULL:$BUILD_NUMBER
                      docker push $FULL:latest
                      docker logout $HARBOR
                    '''
                }
            }
        }
    }

    post {
        success { echo "✅ Đã push $FULL:$BUILD_NUMBER lên Harbor" }
        failure { echo '❌ Lỗi — xem Console Output stage đỏ' }
        always  { sh 'docker rm -f ielts-test 2>/dev/null || true' }
    }
}