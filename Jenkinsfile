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

        stage('Update GitOps - dev') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-push',
                    usernameVariable: 'GUSER',
                    passwordVariable: 'GTOKEN'
                )]) {
                    sh '''
                      git config user.email "jenkins@ci.local"
                      git config user.name "Jenkins CI"

                      # Cập nhật tag trong values-dev.yaml bằng số build này
                      sed -i "s|^  tag: .*|  tag: \\"$BUILD_NUMBER\\"|" chart/values-dev.yaml

                      git add chart/values-dev.yaml
                      git commit -m "ci: deploy build $BUILD_NUMBER to dev [skip ci]" || echo "Không có gì thay đổi"
                      git push https://$GUSER:$GTOKEN@github.com/conbocuoi2004/ielts-planner.git HEAD:main
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