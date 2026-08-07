pipeline {
    agent any

    environment {
        HARBOR   = "registry.conraddesign.uk"
        PROJECT  = "ielts"
        IMAGE    = "ielts-planner"
        FULL     = "${HARBOR}/${PROJECT}/${IMAGE}"
        EC2_HOST = "ubuntu@<IP-PUBLIC-EC2>"        // ← THAY IP thật của EC2 vào đây
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

                      sed -i "s|^  tag: .*|  tag: \\"$BUILD_NUMBER\\"|" chart/values-dev.yaml

                      git add chart/values-dev.yaml
                      git commit -m "ci: deploy build $BUILD_NUMBER to dev [skip ci]" || echo "Không có gì thay đổi"
                      git push https://$GUSER:$GTOKEN@github.com/conbocuoi2004/ielts-planner.git HEAD:main
                    '''
                }
            }
        }

        stage('Deploy to EC2 prod') {
            steps {
                // Cổng phê duyệt: Jenkins dừng chờ, vào UI bấm Proceed mới deploy.
                // Muốn full tự động thì xóa dòng input bên dưới.
                input message: "Deploy build ${BUILD_NUMBER} lên production (ielts.conraddesign.uk)?"

                sshagent(credentials: ['ec2-ssh']) {
                    sh '''
                      ssh -o StrictHostKeyChecking=no $52.62.194.218 "
                        docker pull $FULL:$BUILD_NUMBER &&
                        docker rm -f ielts-app &&
                        docker run -d --name ielts-app \
                          --restart unless-stopped \
                          --network web \
                          --memory=150m \
                          -v /opt/ielts-data:/app/data \
                          $FULL:$BUILD_NUMBER
                      "
                    '''
                }
            }
        }
    }

    post {
        success { echo "✅ Build $BUILD_NUMBER: dev (GitOps) + prod (ielts.conraddesign.uk) đã cập nhật" }
        failure { echo '❌ Lỗi — xem Console Output stage đỏ' }
        aborted { echo '⏹ Build bị hủy (có thể do từ chối phê duyệt prod)' }
        always  { sh 'docker rm -f ielts-test 2>/dev/null || true' }
    }
}