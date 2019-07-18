# Dgoss for Docker

Goss is an yaml based serverspec alternative which runs tests against infrastucture and checks the system configuration. This is similar to Inspec/Rspec tests we run in Chef

Dgoss is a wrapper for goss, which runs tests againat Docker image. It can be used in TDD (Test driven development), to make sure the docker image is properly configured.

## Installation
Dgoss has to be installed on local machine, we cannot skip the installation with a docker image. 

```bash
curl -L https://raw.githubusercontent.com/aelsabbahy/goss/master/extras/dgoss/dgoss -o /usr/local/bin/dgoss
chmod +rx /usr/local/bin/dgoss
```

Dgoss also needs Goss binary to perform the actual tests, remember dgoss is just a thin wrapper to the Docker images. 
```bash
curl -L https://github.com/aelsabbahy/goss/releases/download/v0.3.6/goss-linux-amd64 -o ~/Downloads/goss-linux-amd64
export GOSS_PATH=~/Downloads/goss-linux-amd64
```
Make sure to add th GOSS_PATH environment variable to your `~/.bashrc` so to autoload the Path

Test if dgoss setup is done
```bash
dgoss run
```

## Testing a sample Docker image

```bash
ln -s jenkins-goss.yaml goss.yaml
dgoss run -e JENKINS_OPTS="--httpPort=8080 --httpsPort=-1" -e JAVA_OPTS="-Xmx1048m" jenkins:alpine
```
This commands runs a new jenkins container and run tests sepcified in `jenkins-goss.yaml`

### Waiting for container to be up
By default, goss starts the container and immediately runs the goss tests. At times we might need to wait for few processes inside the container to be up and run the tests. In thoses scenarios, `goss-wait.yaml` can be used. Lets try to run the waited tests for Jenkins, instead of running tests right way, we can wait till the process is up. 

```bash
unlink goss.yaml
ln -s jenkins-slow-goss.yaml goss.yaml
ln -s jenkins-slow-goss-wait.yaml goss_wait.yaml
dgoss run -e JENKINS_OPTS="--httpPort=8080 --httpsPort=-1" -e JAVA_OPTS="-Xmx1048m" jenkins:alpine
```

<details><summary>Sample Logs</summary>

```
INFO: Starting docker container
INFO: Container ID: a3de9636
INFO: Found goss_wait.yaml, waiting for it to pass before running tests
INFO: Sleeping for 0.2
INFO: Container health
PID                 USER                TIME                COMMAND
27718               1000                0:00                /bin/tini -- /usr/local/bin/jenkins.sh
27755               1000                0:30                java -Xmx1048m -jar /usr/share/jenkins/jenkins.war --httpPort=8080 --httpsPort=-1
INFO: Running Tests
File: /var/jenkins_home/copy_reference_file.log: exists: matches expectation: [true]
File: /var/jenkins_home/copy_reference_file.log: mode: matches expectation: ["0644"]
File: /var/jenkins_home/copy_reference_file.log: owner: matches expectation: ["jenkins"]
File: /var/jenkins_home/copy_reference_file.log: group: matches expectation: ["jenkins"]
File: /var/jenkins_home/copy_reference_file.log: filetype: matches expectation: ["file"]
File: /var/jenkins_home/copy_reference_file.log: contains: matches expectation: [/^INSTALLED/]
Title: Checking that $JENKINS_OPTS and $JAVA_OPTS are in the ps line
Command: ps -eo args | grep java: exit-status: matches expectation: [0]
Command: ps -eo args | grep java: stdout: matches expectation: [/jenkins.war\s*--httpPort=8080 --httpsPort=-1/ /java\s*-Xmx1048m\s*-jar/]
HTTP: http://admin:9d5abebc1abf45dab4d82ae221bb7bf3@localhost:8080: status: matches expectation: [200]
HTTP: http://admin:9d5abebc1abf45dab4d82ae221bb7bf3@localhost:8080: Body: matches expectation: [SetupWizard]


Total Duration: 0.139s
Count: 10, Failed: 0, Skipped: 0
INFO: Deleting container
```

</details>

## Testing a Sample Dockerfile based Image

Build the docker image
```bash
cd Dockerfile-example
docker build -t alpine-test .
```
Here we are installing two packages curl and net-tools of specific version. 

Goss.yaml has the sample test cases to test the installed packages and their versions

### Testing by specifying all packages
```yaml
package:
  curl:
    installed: true
    versions: 
      - "7.65.1-r0"
  
  net-tools:
    installed: true
    versions: 
      - "1.60_git20140218-r2"
```

```bash
dgoss run alpine-test
```

### Testing by looping through Packages locally
```yaml
package:
  {{- range mkSlice "curl" "net-tools" }}
    {{.}}:
      installed: true
  {{end}}
```

```bash
dgoss run alpine-test
```

### Testing by looping through local variable and using if/else condition
```yaml
packages:
  {{- range mkSlice "curl" "net-tools" }}
    {{.}}:
      installed: true
      versions:
        {{if eq . "curl"}}
        - "7.65.1-r0"
        {{end}}
        {{if eq . "net-tools"}}
        - "1.60_git20140218-r2"
        {{end}}
  {{end}}
```

**or**

```yaml
package:
  {{- range mkSlice "curl" "net-tools" }}
    {{.}}:
      installed: true
      versions: {{if eq . "curl"}} ["7.65.1-r0"] {{else}} ["1.60_git20140218-r2"] {{end}}
  {{end}}
```

```bash
dgoss run alpine-test
```

### Testing by looping through variable of packages
```yaml
packages:
  curl:
    - "7.65.1-r0"
  net-tools:
    - "1.60_git20140218-r2"
```

```yaml
package:
{{range $name, $vers := .Vars.packages}}
  {{$name}}:
    installed: true
    versions:
    {{range $vers}}
      - {{.}}
    {{end}}
{{end}}
```

```bash
export GOSS_VARS=vars.yaml
dgoss run alpine-test
```


## Testing a sample Web server

This is a sample Nodejs Docker image with Rest API. And the goss file shows the proper way of testing Docker Image. 

1. Build the docker image
```bash
cd sample-webserver
docker build -t sample-webserver .
```

Goss.yaml has the sample test cases to test the files, port, API and binary versions

### Testing the application files are copied well
```yaml
file:
  /app/server.js:
    exists: true
  /app/package.json:
    exists: true
  /app/node_modules:
    exists: true
    filetype: directory
```

```bash
dgoss run sample-webserver
```

### Testing the application dependancies are installed
```
export GOSS_VARS=package.json
file:
{{range $name, $val := .Vars.dependencies}}
  /app/node_modules/{{ $name }}:
    exists: true
    filetype: directory
{{end}}
```

```bash
dgoss run sample-webserver
```

### Testing the application binaries and versions
```yaml
file:
  /usr/bin/node:
    exists: true
    owner: root
    group: root    
  /usr/bin/npm:
    exists: true
    owner: root
    group: root    

command:
  node --version:
    exit-status: 0
    stdout:
      - v10.16.0
    timeout: 10000
  npm --version:
    exit-status: 0
    stdout:
      - "6.9.0"
    timeout: 10000
```

```bash
dgoss run sample-webserver
```

### Testing the application health check endpoint
```yaml
http:
  http://localhost:3000/health:
    status: 200
    timeout: 5000
    body: ["I'm alive"]
```

```bash
dgoss run sample-webserver
```

### Waiting for Web server to up 
```
$cat goss_wait.yaml
port:
  tcp6:3000:
    listening: true
```

```bash
dgoss run sample-webserver
```

<details><summary>Sample Logs</summary>

```
$ dgoss run sample-webserver
INFO: Starting docker container
INFO: Container ID: bd17740c
INFO: Found goss_wait.yaml, waiting for it to pass before running tests
INFO: Sleeping for 0.2
INFO: Container health
PID                 USER                TIME                COMMAND
46213               root                0:00                node /app/server.js
INFO: Running Tests
File: /usr/bin/node: exists: matches expectation: [true]
File: /usr/bin/node: owner: matches expectation: ["root"]
File: /usr/bin/node: group: matches expectation: ["root"]
File: /usr/bin/npm: exists: matches expectation: [true]
File: /usr/bin/npm: owner: matches expectation: ["root"]
File: /usr/bin/npm: group: matches expectation: ["root"]
Command: node --version: exit-status: matches expectation: [0]
Command: node --version: stdout: matches expectation: [v10.16.0]
Command: npm --version: exit-status: matches expectation: [0]
Command: npm --version: stdout: matches expectation: [6.9.0]
HTTP: http://localhost:3000/health: status: matches expectation: [200]
HTTP: http://localhost:3000/health: Body: matches expectation: [I'm alive]


Total Duration: 3.105s
Count: 12, Failed: 0, Skipped: 0
INFO: Deleting container
```

</details>

### References
1. Read through default functions available https://github.com/aelsabbahy/goss/blob/master/docs/manual.md#templates
2. 