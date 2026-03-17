///////////////////////////////////////////////////////////////////////////////
// Forge CI/CD Pipeline — Jenkins
//
// Stages:  Lint → Test → Build → Security → Release
// Requirements: Docker Pipeline plugin, Credentials plugin, Git plugin
//
// Version is derived from git tag (v2026.03.0 → 2026.03.0).
// For non-tag builds, commit SHA is used.
//
// Jenkins picks up tags automatically when:
//   - Multibranch Pipeline: "Discover tags" enabled in Branch Sources
//   - Classic Pipeline: "Build when a tag is pushed" trigger
///////////////////////////////////////////////////////////////////////////////

pipeline {
    agent any

    environment {
        PYTHON_VERSION   = '3.12'
        NODE_VERSION     = '20'
        DOCKER_BUILDKIT  = '1'
        // Derive version from git tag or commit SHA
        GIT_TAG          = sh(script: 'git describe --tags --exact-match 2>/dev/null || echo ""', returnStdout: true).trim()
        VERSION          = sh(script: '''
            TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
            if [ -n "$TAG" ]; then
                echo "$TAG" | sed 's/^v//'
            else
                git rev-parse --short HEAD
            fi
        ''', returnStdout: true).trim()
        IS_TAG_BUILD     = sh(script: 'git describe --tags --exact-match 2>/dev/null && echo true || echo false', returnStdout: true).trim()
        // Container registry — configure in Jenkins credentials
        REGISTRY         = credentials('forge-registry-url')
        IMAGE_NAME       = credentials('forge-image-name')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        // ─── Info ────────────────────────────────────────────────────────
        stage('Info') {
            steps {
                echo "Git tag: ${GIT_TAG ?: '(none — branch build)'}"
                echo "Version: ${VERSION}"
                echo "Tag build: ${IS_TAG_BUILD}"
            }
        }

        // ─── Lint ────────────────────────────────────────────────────────
        stage('Lint') {
            parallel {
                stage('Python Lint') {
                    agent {
                        docker {
                            image "python:${PYTHON_VERSION}-slim"
                            args '--user root'
                        }
                    }
                    steps {
                        sh '''
                            pip install --no-cache-dir -q flake8
                            echo "=== Flake8 (Python lint) ==="
                            flake8 forge/ --count --statistics
                        '''
                    }
                }
                stage('Frontend Lint') {
                    agent {
                        docker {
                            image "node:${NODE_VERSION}-slim"
                            args '--user root'
                        }
                    }
                    steps {
                        dir('forge/ui_next') {
                            sh '''
                                npm ci --prefer-offline
                                echo "=== TypeScript check ==="
                                npx tsc --noEmit
                            '''
                        }
                    }
                }
            }
        }

        // ─── Test ────────────────────────────────────────────────────────
        stage('Test') {
            parallel {
                stage('Python Unit Tests') {
                    agent {
                        docker {
                            image "python:${PYTHON_VERSION}-slim"
                            args '--user root'
                        }
                    }
                    steps {
                        sh '''
                            apt-get update -qq && apt-get install -y -qq \
                                git libpq-dev libldap2-dev libsasl2-dev \
                                libxmlsec1-dev pkg-config gcc
                            pip install --no-cache-dir \
                                -r requirements/requirements.txt \
                                -r requirements/requirements_dev.txt
                            pip install --no-cache-dir -e .

                            echo "=== Python unit tests ==="
                            python -m pytest forge/main/tests/unit/ -x -q --tb=short
                        '''
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: '**/junit-*.xml'
                        }
                    }
                }
                stage('Frontend Unit Tests') {
                    agent {
                        docker {
                            image "node:${NODE_VERSION}-slim"
                            args '--user root'
                        }
                    }
                    steps {
                        dir('forge/ui_next') {
                            sh '''
                                npm ci --prefer-offline
                                echo "=== Frontend unit tests (Vitest) ==="
                                npx vitest run
                            '''
                        }
                    }
                }
            }
        }

        // ─── Build ──────────────────────────────────────────────────────
        stage('Build') {
            when {
                anyOf {
                    branch 'modernization'
                    branch 'devel'
                    branch 'main'
                    buildingTag()
                }
            }
            parallel {
                stage('Build CentOS') {
                    steps {
                        sh """
                            echo "=== Building CentOS image (${VERSION}) ==="
                            make Dockerfile.dev
                            docker build \
                                -f Dockerfile.dev \
                                -t forge:${VERSION}-centos \
                                -t forge:centos-latest \
                                .
                        """
                    }
                }
                stage('Build Ubuntu') {
                    steps {
                        sh """
                            echo "=== Building Ubuntu image (${VERSION}) ==="
                            pip3 install ansible-core 2>/dev/null || true
                            ansible-playbook \
                                -e ansible_python_interpreter=python3 \
                                tools/ansible/dockerfile.yml \
                                -e dockerfile_name=Dockerfile.ubuntu \
                                -e build_dev=False \
                                -e receptor_image=quay.io/ansible/receptor:devel \
                                -e dockerfile_template=Dockerfile.ubuntu.j2
                            docker build \
                                -f Dockerfile.ubuntu \
                                -t forge:${VERSION}-ubuntu \
                                -t forge:ubuntu-latest \
                                .
                        """
                    }
                }
            }
        }

        // ─── Security ───────────────────────────────────────────────────
        stage('Security') {
            when {
                anyOf {
                    branch 'modernization'
                    branch 'devel'
                    buildingTag()
                }
            }
            parallel {
                stage('pip-audit') {
                    agent {
                        docker {
                            image "python:${PYTHON_VERSION}-slim"
                            args '--user root'
                        }
                    }
                    steps {
                        sh '''
                            pip install --no-cache-dir -q pip-audit
                            echo "=== pip-audit (Python CVE scan) ==="
                            pip-audit -r requirements/requirements.txt --desc || true
                        '''
                    }
                }
                stage('Trivy Scan') {
                    steps {
                        sh '''
                            echo "=== Trivy container scan ==="
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity CRITICAL \
                                forge:centos-latest || true
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity CRITICAL \
                                forge:ubuntu-latest || true
                        '''
                    }
                }
            }
        }

        // ─── Release ────────────────────────────────────────────────────
        // Only runs when building a git tag (v2026.03.0, v2026.04.1, etc.)
        stage('Release') {
            when {
                buildingTag()
            }
            steps {
                script {
                    echo "=== Releasing Forge ${VERSION} (from tag ${GIT_TAG}) ==="
                    docker.withRegistry("https://${REGISTRY}", 'forge-registry-creds') {
                        sh """
                            # Tag and push CentOS (default)
                            docker tag forge:centos-latest ${REGISTRY}/${IMAGE_NAME}:${VERSION}-centos
                            docker tag forge:centos-latest ${REGISTRY}/${IMAGE_NAME}:${VERSION}
                            docker tag forge:centos-latest ${REGISTRY}/${IMAGE_NAME}:latest
                            docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}-centos
                            docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
                            docker push ${REGISTRY}/${IMAGE_NAME}:latest

                            # Tag and push Ubuntu
                            docker tag forge:ubuntu-latest ${REGISTRY}/${IMAGE_NAME}:${VERSION}-ubuntu
                            docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}-ubuntu
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed — Forge ${VERSION}"
        }
        failure {
            echo "Pipeline FAILED — Forge ${VERSION}"
        }
        cleanup {
            sh """
                docker rmi forge:centos-latest forge:ubuntu-latest 2>/dev/null || true
                docker rmi forge:${VERSION}-centos forge:${VERSION}-ubuntu 2>/dev/null || true
            """
        }
    }
}
