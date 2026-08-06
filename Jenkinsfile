pipeline {
    agent any

    environment {
        REGISTRY = "localhost:5000"          // registry-server trên chính VM
        IMAGE    = "ielts-planner"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $REGISTRY/$IMAGE:$BUILD_NUMBER -t $REGISTRY/$IMAGE:latest .'
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                  docker rm -f ielts-test 2>/dev/null || true
                  docker run -d --name ielts-test $REGISTRY/$IMAGE:$BUILD_NUMBER
                  sleep 3
                  docker exec ielts-test wget -qO- http://localhost:5000/health
                  docker rm -f ielts-test
                '''
            }
        }

        stage('Push to Registry') {
            steps {
                sh '''
                  docker push $REGISTRY/$IMAGE:$BUILD_NUMBER
                  docker push $REGISTRY/$IMAGE:latest
                '''
            }
        }
    }

    post {
        success { echo "✅ Đã push $REGISTRY/$IMAGE:$BUILD_NUMBER vào registry" }
        failure { echo '❌ Lỗi — mở Console Output của stage đỏ' }
        always  { sh 'docker rm -f ielts-test 2>/dev/null || true' }
    }
}