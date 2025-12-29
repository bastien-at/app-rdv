helperData=[
    runtimeAutoActions: [
        prAddComment: [],
        prAddLabel: [],
        prAddAssignee: [],
        prAddReviewer: [],
    ]
]

def commitStatus (context, state, message = '') {
    if (state == 'ERROR' && (stagesStatus[context] == 'SUCCESS' || stagesStatus[context] == 'ERROR')) {
        return
    }
    if (state == 'SUCCESS' && (stagesStatus[context] == 'SUCCESS' || stagesStatus[context] == 'ERROR')) {
        return
    }
    if (state == 'PENDING' && stagesStatus[context] != false) {
        return
    }
    stagesStatus[context] = state
    step([
        $class: 'GitHubCommitStatusSetter',
        commitShaSource: [$class: 'ManuallyEnteredShaSource', sha: "${env.ghprbActualCommit}"],
        contextSource: [
            $class: 'ManuallyEnteredCommitContextSource',
            context: context
        ],
        statusResultSource: [
            $class: 'ConditionalStatusResultSource',
            results: [[$class: 'AnyBuildResult', message: message, state: state]]
        ]
    ]);
}

def killAndCleanPrevious() {
    def killed = killPrevious()
    // Kill here because if in killPrevious, an exception is throw...
    // Sleep is here to be sure previous execution is really finished
    if (killed) {
        println("==== Some jobs killed, do a pause...")
        sleep(5)
        cleanWorkspaces()
    }
}

def killPrevious() {
    println("==== Kill previous jobs")

    def killed = false
    def toRemove = []

    for(def build in Jenkins.instance.getJob("${env.JOB_NAME}").getBuilds()) {
        if(build.isInProgress() && build.getId() != "${env.BUILD_NUMBER}" && build.getEnvVars().ghprbSourceBranch == "${env.ghprbSourceBranch}") {
            killed = build
            println("== Kill build #" + build.getId())
            build.doKill()
            break
        }
    }

    return killed != false
}

def cleanWorkspaces() {
    println("==== Clean workspaces")

    ( [] + Jenkins.instance + Jenkins.instance.nodes ).each { instance->
        def toRemove = []
        instance.toComputer().workspaceList.inUse.each {ws->
            // Condition is true on master
            // On slaves, data on ws don't give data to know if thread is active or not
            // So do nothing on slave, now, worker are configured as one shot
            if (ws.value.holder instanceof hudson.model.Executor) {
                if (!ws.value.holder.isActive()) {
                    toRemove.add(ws.key)
                }
            }else{
                //toRemove.add(ws.key)
            }
        }
        toRemove.each{ key->
            println("==== Release workspace #" + key)
            instance.toComputer().workspaceList.inUse.remove(key)
        }
    }
}

def initAppsStatus() {
    appsStatus.each{ app, value ->
        appsStatus[app] = sh(returnStatus: true, script: "git diff --quiet origin/${ghprbTargetBranch}...origin/${ghprbSourceBranch} -- ${app}") != 0
    }

    println '### Apps status ###'
    println appsStatus
}

def runParallel(mainStageLabel, stages, int slots = 999) {
    slots = Math.min(slots, stages.size())
    def parallelStages = [:]
    for(int i = 0; i < slots; i++) {
        def j = i+1
        def stageLabel = mainStageLabel + ' - Parallel branch ' + j
        parallelStages[stageLabel] = {
            stage(stageLabel) {
                def todo = stages.removeAt(0)
                while(todo) {
                    todo()
                    try {
                        todo = stages.removeAt(0)
                    } catch(Exception) {
                        todo = false
                    }
                }
            }
        }
    }

    parallel parallelStages
}

def stageAutoAction(jenkinsActionsFile) {
    script {
        def todoActions = [
            prAddComment: [],
            prAddLabel: [],
            prAddAssignee: [],
            prAddReviewer: [],
            prMergeAsSquash: false
        ]
        def resetResult = resetGithubAction()
        def previousActionIsActive = resetResult['previousActionIsActive']

        echo("Reset result (${resetResult})")
        if(resetResult['continueAction']) {
            def rulesRecords = readCSV file: jenkinsActionsFile, format: CSVFormat.DEFAULT.withHeader()
            def line=0;
            // def rulesRecords = readCSV text: '__csv_content_to_test', format: CSVFormat.DEFAULT.withHeader()
            for (def rules in rulesRecords) {
                ++line
                def status_condition = rules.get('status_condition')
                def trigger = rules.get('trigger')
                def target = rules.get('target')
                def action = rules.get('action')
                def content = rules.get('content')
                def matcher = 0

                if(status_condition.toLowerCase() != "all" && status_condition.toLowerCase() != currentBuild.currentResult.toLowerCase()) {
                    echo("Line $line skipped : wrong status")
                    continue
                }

                switch (trigger) {
                    case "filename_contains":
                        matcher = sh(returnStdout: true, script: "git diff --name-only origin/${ghprbTargetBranch}...origin/${ghprbSourceBranch} | grep ${target} | wc -l")
                        matcher = matcher as int
                        break
                    case "pr_and_commit_are_jenkins":
                        matcher = (ghprbPullAuthorLogin == "alltricks-bot" && ghprbActualCommitAuthor == "dev-jenkins") ? 1 : 0
                        break
                    default:
                        echo("Line $line skipped : unknown trigger")
                        continue
                }

                if(matcher > 0) {
                    switch (action) {
                        case "publish_comment":
                            todoActions['prAddComment'].add(content)
                            break

                        case "add_label":
                            if(!previousActionIsActive['label'].containsKey(content) || !previousActionIsActive['label'][content]){
                                // Add new label or toogle disabled label
                                todoActions['prAddLabel'].add(content)
                            }else if(previousActionIsActive['label'].containsKey(content) && previousActionIsActive['label'][content]){
                                // Unset label already enabled
                                previousActionIsActive['label'].remove(content)
                            }
                            break

                        case "add_assignee":
                            if(!previousActionIsActive['assigned'].containsKey(content) || !previousActionIsActive['assigned'][content]){
                                // Add new assigne or toogle disabled assigne
                                todoActions['prAddAssignee'].add(content)
                            }else if(previousActionIsActive['assigned'].containsKey(content) && previousActionIsActive['assigned'][content]){
                                // Unset assigne already enabled
                                previousActionIsActive['assigned'].remove(content)
                            }
                            break

                        case "add_reviewer":
                            if(!previousActionIsActive['reviewer'].containsKey(content) || !previousActionIsActive['reviewer'][content]){
                                // Add new reviewer or toogle disabled reviewer
                                todoActions['prAddReviewer'].add(content)
                            }else if(previousActionIsActive['reviewer'].containsKey(content) && previousActionIsActive['reviewer'][content]){
                                // Unset reviewer already enabled
                                previousActionIsActive['reviewer'].remove(content)
                            }
                            break

                        case "merge_as_squash":
                            todoActions['prMergeAsSquash'] = true
                            break

                    }
                }
            }

            // Add runtime actions
            helperData.runtimeAutoActions.each{
                method, contents ->
                    todoActions[method] = contents + todoActions[method]
            }

            if(!todoActions['prAddComment']){
                todoActions['prAddComment'].add("_RESERVED_")
            }

            echo("Actions to do (${todoActions})")
            todoActions.each{
                method, content ->
                    if(content) {
                        // method(content)
                        switch (method) {
                            case "prAddComment":
                                prAddComment(content, previousActionIsActive['comment'])
                                previousActionIsActive.remove('comment')
                                break

                            case "prAddLabel":
                                prAddLabel(content)
                                break

                            case "prAddAssignee":
                                prAddAssignee(content)
                                break

                            case "prAddReviewer":
                                prAddReviewer(content)
                                break
                            case "prMergeAsSquash":
                                prMergeAsSquashWithPrTitleAsCommitName()
                                break
                        }
                    }
            }

            cleanPR(previousActionIsActive)
        }
    }
}

def cleanPR(previousActionIsActive){
    def assigneesToRemove = []
    def reviewersToRemove = []
    previousActionIsActive.each{
        type, content ->
            if(content) {
                content.each{
                    item, isActive ->
                        if(isActive){
                            echo("to delete : ${type}(${item})")
                            switch (type) {
                                case "label":
                                    sendGitHubRequest('DELETE', "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/labels/${item}")
                                    break

                                case "assigned":
                                    assigneesToRemove.add(item)
                                    break

                                case "reviewer":
                                    reviewersToRemove.add(item)
                                    break
                            }
                        }
                }
            }
    }
    if(assigneesToRemove) {
        sendGitHubRequest('DELETE', "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/assignees", "{\"assignees\": [\"${assigneesToRemove.join('","')}\"]}")
    }
    if(reviewersToRemove) {
        sendGitHubRequest('DELETE', "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/requested_reviewers", "{\"reviewers\": [\"${reviewersToRemove.join('","')}\"]}")
    }
}

def resetGithubAction(page=1){
    def curlResponse = ''
    def githubResponse = ''
    def nextPage = null
    def remainCalls = 5000
    def previousActionIsActive = [
        'comment': null,
        'label': [
            'Arch%E2%9C%85': true,
            'Arch%F0%9F%91%80': true
        ],
        'assigned': [:],
        'reviewer': [:],
    ]
    def continueAction = false
    sh(script: 'curl -siL -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/' + ghprbGhRepository + '/issues/' + ghprbPullId + '/timeline?per_page=100&page=' + page + '" -o curlResponse.txt')

    nextPage = sh(script: "grep -oP '(?<=&page=)[[:digit:]]+(?=>; rel=\"next\")' curlResponse.txt || echo 0", returnStdout: true).trim().toInteger()
    remainCalls = sh(script: "grep -oP '(?<=x-ratelimit-remaining: )[[:digit:]]+' curlResponse.txt || echo 0", returnStdout: true).trim().toInteger()
    githubResponse = sh(script: "grep -oPz '(?<=[[:space:]]{2})[[:punct:]](.|[[:space:]])*[[:punct:]]' curlResponse.txt", returnStdout: true).trim()

    if(!remainCalls) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            error "Error on github calls about actions, check github response below\n\n" + sh(script: "head -n 30 curlResponse.txt", returnStdout: true).trim()
        }
    }

    continueAction = remainCalls > 1000
    if (continueAction && githubResponse) {
        def githubEventsTimeline = readJSON text: githubResponse
        def authorizedEvents = [
            "commented",
            "labeled",
            "unlabeled",
            "assigned",
            "unassigned",
            "review_requested",
            "review_request_removed",
        ]
        for(def githubEvent in githubEventsTimeline) {
            if(
                authorizedEvents.contains(githubEvent['event'])
                && 'alltricks-bot' == githubEvent['actor']['login']
            ) {
                switch (githubEvent['event']) {
                    case "commented":
                        if(githubEvent['body'].startsWith("## Jenkins")) {
                            previousActionIsActive['comment'] = ['id': githubEvent['id'], 'isReserved': githubEvent['body'].contains('_RESERVED_')]
                        }
                        break

                    case "labeled":
                        if (labelResetable(githubEvent['label']['name'])) {
                            previousActionIsActive['label'][githubEvent['label']['name']] = true
                        }
                        break
                    case "unlabeled":
                            previousActionIsActive['label'][githubEvent['label']['name']] = false
                        break

                    case "assigned":
                        previousActionIsActive['assigned'][githubEvent['assignee']['login']] = true
                        break
                    case "unassigned":
                        previousActionIsActive['assigned'][githubEvent['assignee']['login']] = false
                        break

                    case "review_requested":
                        previousActionIsActive['reviewer'][githubEvent['requested_reviewer']['login']] = true
                        break
                    case "review_request_removed":
                        previousActionIsActive['reviewer'][githubEvent['requested_reviewer']['login']] = false
                        break
                }
            }
        }

        if(nextPage) {
            result = resetGithubAction(nextPage)
            continueAction = result['continueAction']

            previousActionIsActive = [
                'comment': previousActionIsActive['comment'] ?: result['previousActionIsActive']['comment'],
                'label': [*:previousActionIsActive['label'], *:result['previousActionIsActive']['label']],
                'assigned': [*:previousActionIsActive['assigned'], *:result['previousActionIsActive']['assigned']],
                'reviewer': [*:previousActionIsActive['reviewer'], *:result['previousActionIsActive']['reviewer']],
            ]
        }
    }
    return [
        "continueAction": continueAction,
        "previousActionIsActive": previousActionIsActive
    ]
}

def labelResetable(label){
    def unResetableLabel = [
        'not_delete_qualif_env',
        'qualif_env_use_full',
        'qualif_env_use_mep',
        'qualif_env_use_regular',
        'not_delete_strio_env',
        'strio_env_use_full',
        'strio_env_use_mep',
        'strio_env_use_regular',
    ]
    if ("${ghprbSourceBranch}" =~ /^mep-\d{4}-\d{2}-\d{2}$/ && unResetableLabel.contains(label)) {
        return false
    }
    return true
}

def prAddComment(comments, botComment = null) {
    if(botComment && botComment.isReserved && comments[0] == '_RESERVED_') {
        return
    }

    def verb = 'POST'
    def url = "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/comments"
    if (botComment) {
        verb = 'PATCH'
        url = "https://api.github.com/repos/${ghprbGhRepository}/issues/comments/${botComment.id}"
    }
    def body = """\
    {"body": "## Jenkins\\n\\n${comments.join('\\n\\n#\\n\\n')}"}
    """
    sendGitHubRequest(verb, url, body)
}

def prAddLabel(labels) {
    def url = "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/labels"
    def body = """\
    {"labels": ["${labels.join('","')}"]}
    """
    sendGitHubRequest('POST', url, body)
}

def prAddAssignee(assignees) {
    def url = "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/assignees"
    def body = """\
    {"assignees": ["${assignees.join('","')}"]}
    """
    sendGitHubRequest('POST', url, body)
}

def prAddReviewer(reviewers) {
    def url = "https://api.github.com/repos/${ghprbGhRepository}/pulls/${ghprbPullId}/requested_reviewers"
    def body = """\
    {"reviewers": ["${reviewers.join('","')}"]}
    """
    sendGitHubRequest('POST', url, body)
}

def prMergeAsSquash(String title) {
    def url = "https://api.github.com/repos/${ghprbGhRepository}/pulls/${ghprbPullId}/merge"
    def body = """\
    {"merge_method": "squash", "commit_title": "${title}"}
    """
    sendGitHubRequest('PUT', url, body)
}

def prMergeAsSquashWithPrTitleAsCommitName() {
    def prData = readJSON text: prGet()
    def title = prData.title ? prData.title + " (#" + prData.number + ")" : ""

    prMergeAsSquash(title)
}

def prGet() {
    def url = "https://api.github.com/repos/${ghprbGhRepository}/pulls/${ghprbPullId}"
    def response = sendGitHubRequest('GET', url)
    return response
}

def sendGitHubRequest(verb, url, body = null, curlHeader = '') {
    def request = 'curl -s -H "Authorization: token $GITHUB_TOKEN" -H "Content-Type: application/json" ' + curlHeader + ' -X ' + verb + ' ' + (body ? "-d '${body}' " : ' ') + "'${url}'"
    println("[svi] Request: " + request)
    def response = sh(returnStdout: true, script: request).trim()
    return response
}

def stageGitContext() {
    try {
        commitStatus("${stageGitContext}", 'PENDING')

        if ("${jobVersionChecker}" != "${env.JOB_VERSION_CHECKER}") {
            error "You try to execute a not up to date version of jenkins file. Please rebase your branch and retry"
        }

        if ("${ghprbSourceBranch}" =~ /[^a-zA-Z0-9_-]/) {
            error "Branch name is not correct, should match ^[^a-zA-Z0-9_-]+\$"
        }

        if (ghprbSourceBranch.length() > 60) {
             error "The branch name is too long. Make sure it does not exceed 60 characters! Check documentation"
        }

        if (ghprbTargetBranch != 'master') {
            def notRebased = sh(script: "git log origin/${ghprbSourceBranch}..origin/${ghprbTargetBranch} | wc -l", returnStdout: true).trim()
            if (notRebased.toInteger() > 0) {
                def conflicts = sh(script: "git merge --no-commit --no-ff origin/${ghprbTargetBranch}", returnStatus: true);
                sh(script: "git merge --abort");
                if(conflicts.toInteger() != 0) {
                    error("Source branch '${ghprbSourceBranch}' is not rebased with target branch '${ghprbTargetBranch}' and there are conflicts!\nPlease rebase it to be able to run CI.")
                }

                def lastCommitTs = sh(script: "git log -1 --format=%ct origin/${ghprbSourceBranch}", returnStdout: true).trim();
                if(((new Date()).getTime()/1000)-86400 > lastCommitTs.toInteger()){
                    error("Source branch '${ghprbSourceBranch}' is not rebased with target branch '${ghprbTargetBranch}' and is old!\nPlease rebase it to be able to run CI.")
                }

                println "Source branch '${ghprbSourceBranch}' is not rebased with target branch '${ghprbTargetBranch}' but is recent and has no conflict"
            }
        }

        if (!("${ghprbSourceBranch}" =~ /^mep-\d{4}-\d{2}-\d{2}$/)) {
            def check = sh(returnStatus: true, script: "git log --oneline origin/${ghprbSourceBranch} --not origin/${ghprbTargetBranch} -- tools/devops | grep -v 'Merge commit '")
            if (check == 0) {
                error "PR contains some changes directly on tools/devops, it is a subtree, so it's not authorized (check with devops)"
            }
        }

        commitStatus("${stageGitContext}", 'SUCCESS')
    } catch (Exception e) {
        commitStatus("${stageGitContext}", 'ERROR', e.getMessage())
        throw e
    }
}

def stageMaxFileSizeReached(maxFileSize) {
    try{
        def listMaxFileSizeReached = sh(script: "git diff --name-only --diff-filter=d origin/${ghprbTargetBranch}...origin/${ghprbSourceBranch} | xargs -r -I{} bash -c 'test -f \"{}\" && find \"{}\" -size +${maxFileSize}'", returnStdout: true).trim()
        if (listMaxFileSizeReached.length() > 0) {
            error("Source branch contains files larger than ${maxFileSize}:\n${listMaxFileSizeReached}")
        }
        commitStatus("${stageMaxFileSizeReached}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageMaxFileSizeReached}", 'ERROR')
            error e.toString()
        }
    }
}

def stagePhpcs(stageName, workingDir, pathReplace, bin = "vendor/bin") {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf checkstyle/cs
            mkdir -p checkstyle/cs
            make php args='${bin}/phpcs --report="checkstyle" --report-file="checkstyle/cs/phpcs.xml"'
            exit1=\$?
            make php args='${bin}/php-cs-fixer fix --allow-risky=yes --dry-run --format checkstyle > checkstyle/cs/phpcs-fixer.xml'
            exit2=\$?
            sed -i -E 's#(<file.* name=")/var/www/[^/]+#\\1${pathReplace}#g' checkstyle/cs/*.xml
            exit \$((exit1|exit2))
        """
        def ret = recordIssues skipBlames: true, skipDeltaCalculation: true, skipPublishingChecks: true, sourceCodeRetention: 'NEVER',
            enabledForFailure: true, trendChartType: 'NONE', icon: 'userContent/phpcs.svg',
            tools: [checkStyle(id: "${stageName}", name:"${stageValue}", pattern: "${workingDir}/checkstyle/cs/*.xml")]
        if (ret.first().getTotalSize() != 0 || exitCode != 0) {
            error "Some code style rules failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageMappingValidation(stageName) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        sh label: 'Execution', script: """#!/bin/bash
            set -e
            cd appsv3/symfony/backoffice
            make mapping-validate
        """
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageOpenAPIValidation(stageName, workingDir) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set -e
            cd ${workingDir}
            rm -rf checkstyle/oalint
            mkdir -p checkstyle/oalint
            make openapi-validate args="--format checkstyle > checkstyle/oalint/openapi-lint.xml" || true
            sed -i -E 's#(<file.* name=")#\\1${workingDir}/#g' checkstyle/oalint/openapi-lint.xml
        """
        def ret = recordIssues skipBlames: true, skipDeltaCalculation: true, skipPublishingChecks: true, sourceCodeRetention: 'NEVER',
            enabledForFailure: true, trendChartType: 'NONE', icon: 'userContent/openapi.svg',
            tools: [checkStyle(id: "${stageName}", name:"${stageValue}", pattern: "${workingDir}/checkstyle/oalint/*.xml")]
        if (ret.first().getTotalSize() != 0 || exitCode != 0) {
            error "Some code style rules failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stagePhpStan(stageName, workingDir) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf checkstyle/phpstan
            mkdir -p checkstyle/phpstan
            make php args='vendor/bin/phpstan analyze --error-format=checkstyle --no-progress -c ./phpstan.neon | tee checkstyle/phpstan/phpstan.xml'
            exitCode=\${PIPESTATUS[0]}
            sed -i -E 's#(<file.* name=")#\\1${workingDir}/#g' checkstyle/phpstan/phpstan.xml
            exit \$exitCode
        """
        def ret = recordIssues skipBlames: true, skipDeltaCalculation: true, skipPublishingChecks: true, sourceCodeRetention: 'NEVER',
            enabledForFailure: true, trendChartType: 'NONE', icon: 'userContent/phpstan.svg',
            tools: [checkStyle(id: "${stageName}", name:"${stageValue}", pattern: "${workingDir}/checkstyle/phpstan/phpstan.xml")]
        if (ret.first().getTotalSize() != 0 || exitCode != 0) {
            error "Some phpstan rules failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stagePhpMd(stageName, workingDir, pathReplace) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf mess-detector
            mkdir -p mess-detector
            make php args='vendor/bin/phpmd src/ text phpmd.xml --suffixes php --reportfile-xml mess-detector/phpmd.xml --ignore-errors-on-exit --ignore-violations-on-exit'
            exitCode=\$?
            sed -i -E 's#(<file.* name=")/var/www/[^/]+#\\1${pathReplace}#g' mess-detector/phpmd.xml
            exit \$exitCode
        """
        def ret = recordIssues skipBlames: true, skipDeltaCalculation: true, skipPublishingChecks: true, sourceCodeRetention: 'NEVER',
            enabledForFailure: true, trendChartType: 'NONE', icon: 'userContent/phpmd.svg',
            tools: [pmdParser(id: "${stageName}", name:"${stageValue}", pattern: "${workingDir}/mess-detector/phpmd.xml")]
        if (ret.first().getTotalSize() != 0 || exitCode != 0) {
            error "Some phpmd rules failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stagePhpunit(stageName, workingDir, pathReplace, bin = 'vendor/bin', coverage = true) {
    def stageValue=this."${stageName}"
    def options=coverage ? '': '--no-coverage'

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf junit-report/phpunit phpunit-log.log
            make php args="-d zend.enable_gc=0 -d memory_limit=-1 ${bin}/phpunit ${options} --log-junit ./junit-report/phpunit/report.xml --colors=always | tee phpunit-log.log"
            exitCode=\${PIPESTATUS[0]}
            (grep -E "Remaining.+deprecation" phpunit-log.log | grep -q -v "indirect" && echo -e "<?xml version=\\x221.0\\x22 encoding=\\x22UTF-8\\x22?><testsuites><testsuite name=\\x22Depreciations\\x22 file=\\x22all\\x22 tests=\\x221\\x22 assertions=\\x221\\x22 errors=\\x220\\x22 failures=\\x221\\x22 skipped=\\x220\\x22 time=\\x220\\x22><testcase name=\\x22depreciations\\x22 class=\\x22depreciations\\x22 classname=\\x22Depreciations\\x22 file=\\x22depreciations\\x22 line=\\x221\\x22 assertions=\\x221\\x22 time=\\x220\\x22><failure type=\\x22Depreciation\\x22>There is some deprecations\\n\$(sed -E -n -e '/Remaining.+deprecation/,\$p' phpunit-log.log )</failure></testcase></testsuite></testsuites>" > ./junit-report/phpunit/report-depreciations.xml) || echo ""
            ! test -f ./junit-report/phpunit/report-depreciations.xml || exitCode=1
            sed -i -E 's#(<file.* name=")/var/www/[^/]+#\\1${pathReplace}#g' junit-report/phpunit/*.xml
            exit \$exitCode
        """
        def ret = junit skipPublishingChecks: true, testResults: "${workingDir}/junit-report/phpunit/*.xml"
        if (ret.getFailCount() > 0 || exitCode != 0) {
            error "Some tests failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageDeptrac(stageName, workingDir, bin = 'vendor/bin', coverage = true) {
    def stageValue=this."${stageName}"
    def isError = false

    try {
        commitStatus("${stageValue}", 'PENDING')

        sh label: 'Execution', script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf junit-report/deptract
            mkdir -p junit-report/deptract

            make arch-validate-common args='--formatter=junit --output=junit-report/deptract/report-common.xml 2>/dev/null | tee'
            make arch-validate-app args='--formatter=junit --output=junit-report/deptract/report-app.xml 2>/dev/null | tee'
        """

        def ret = junit skipPublishingChecks: true, testResults: "${workingDir}/junit-report/deptract/*.xml"
        if (ret.getFailCount() > 0) {
            isError = true
            error "Some tests failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')

            unstable("DomainChecks failed, check output of step 'Execution' above, job reporting or job output - temporary unstable, soon error")
            // error e.toString()
        }
    } finally {
        println("==== depract finally...")
        // Always add a comment with deptrac results
        prDeptracComment(isError, workingDir)
    }
}

def prDeptracComment(isError, workingDir){
    def postId = "${ghprbPullId}-${workingDir}-DomainChecks"
    def verb = 'POST'
    def commentUrl = "https://api.github.com/repos/${ghprbGhRepository}/issues/${ghprbPullId}/comments"

    // Search for existing comment with the same title
    def searchUrl = "https://api.github.com/search/issues?q=${postId}+repo:Alltricks/avanis+state:open&sort=created&order=asc"
    def response = sendGitHubRequest('GET', searchUrl, null, '-H "Accept: application/vnd.github.text-match+json"')
    def searchResults = readJSON text: response
    if (searchResults.total_count) {
        verb = 'PATCH'
        commentUrl = searchResults.items[0].text_matches[0].object_url
    }

    // // generate the content from deptrac command output to mermaid format
    if (isError || searchResults.total_count) {
        def contentCommon = sh(returnStdout: true, script: """
            cd ${workingDir} && make arch-validate-common args='--formatter=mermaidjs --no-progress | tr -d "\\n" 2>/dev/null | tee'
        """).trim()
        def contentApp = sh(returnStdout: true, script: """
            cd ${workingDir} && make arch-validate-app args='--formatter=mermaidjs --no-progress | tr -d "\\n" 2>/dev/null | tee'
        """).trim()
        def title =  "<!-- ${postId} --> \\n ## ArchChecks [${workingDir}] " + (isError ? " - ERROR @sebastien-vitry" : " - SUCCESS")

        def content = "### Hexa\\n\\n```mermaid\\n${contentCommon}\\n```\\n\\n"
        content += contentApp ? "### Domain\\n\\n```mermaid\\n${contentApp}\\n```" : ""
        def body = """\
        {"body": "## ${title}\\n\\n${content}"}
        """
        sendGitHubRequest(verb, commentUrl, body)
    }
}

def stageBehat(stageName, workingDir, verbose = false, noResetSymfony = false, noReset = false, noResetDatabasesFromModels = false, suiteName = false, tags = false) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')

        def tagsToSearch = ['jenkins_debug','only']
        if (tags) {
            tagsToSearch = (tagsToSearch + tags.split(',')).flatten()
        }
        def hasTags = sh returnStdout: true, label: 'Check tags', script: """#!/bin/bash
            cd ${workingDir}
            make php args="vendor/bin/behat ${noResetSymfony || noReset ? '--no-reset' : ''} --tags=${tagsToSearch.join(',')} --dry-run" | grep -P 'tests/behat|@${tagsToSearch.join('|@')}' | tee
        """

        if (tags && !hasTags.length()) {
            println "No scenario tagged with ${tags}, nothing to do"
            commitStatus("${stageValue}", 'SUCCESS')
            return
        }

        if (suiteName && !tags) {
            tags = '~integrity'
        }

        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf junit-report/behat
            mkdir -p junit-report/behat
            make php args="vendor/bin/behat ${hasTags.contains('@jenkins_debug') ? '--tags jenkins_debug' : ''} ${verbose ? '-vv' : ''} ${noResetSymfony ? '--no-reset-symfony' : ''} ${noResetDatabasesFromModels ? '--no-reset-databases-from-models' : ''} ${noReset ? '--no-reset' : ''} ${suiteName ? '--profile ci --suite '+suiteName : ''} ${tags ? '--tags '+tags : ''} -f junit -o junit-report/behat -f pretty -o std --colors | tee junit-report/behat/result.txt"
            exitCode=\${PIPESTATUS[0]}
            sed -i 's#[^a-zA-Z0-9]\\[[0-9]*m##g' junit-report/behat/result.txt
            sed -i -E 's#^(.*<testcase.+status="skipped".+>)(</testcase>)\$#\\1<skipped/>\\2#' junit-report/behat/*.xml
            sed -i -E 's#(<testcase.*classname=")(.+)#\\1${stageValue}.\\2#' junit-report/behat/*.xml
            # Set absolute path on tests
            sed -i -E 's#(<testcase.* file=")#\\1${workingDir}/#g' junit-report/behat/*.xml
            # Add property scenario to each test to be able to get paht/line easily from jenkins
            sed -i -E 's#(<testcase.* file="([^"]+)" line="([^"]+)">)#\\1<properties><property name="scenario" value="\\2:\\3"/></properties>#' junit-report/behat/*.xml
            exit \$exitCode
        """
        def ret = junit keepProperties: true, skipPublishingChecks: true, testResults: "${workingDir}/junit-report/behat/*.xml"
        if (ret.getPassCount() != ret.getTotalCount() || exitCode != 0) {
            def cmd = sh returnStdout: true, label: 'Get sed only tags', script: """#!/bin/bash
                cd ${workingDir}
                cat junit-report/behat/result.txt | grep -Po "^ +(\\Ksed -i.+)"
            """

            def errorString = "```bash\\n${cmd.replaceAll("\\\\", '\\\\\\\\').replaceAll(/"/, '\\\\"').replaceAll(/\n/, '\\\\n')}behat --tags only\\n```"
            if(errorString.length() > 32768) {
                errorString = "Too many errors to display, please check the job output"
            }
            helperData.runtimeAutoActions['prAddComment'].add(
                ":warning::warning::warning: **Failed Scenario on ${stageName}: ${workingDir}** :warning::warning::warning:\\n\\n${errorString}"
            )

            if(hasTags.contains('@jenkins_debug')){
                archiveArtifacts artifacts: "${workingDir}/var/log/*", fingerprint: true
            }
            error "Some tests failed/skipped, check output of step 'Execution' above, job reporting (skipped tests as not reported as failed) or job output"
        }
        if (0 == ret.getPassCount()) {
            error "0 tests passed. quite surprizing. please investigate :-)"
        }

        if (hasTags.contains('@jenkins_debug') || hasTags.contains('@only')) {
            error "Some tests have tags @only | @jenkins_debug, please remove them"
        }

        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageLinter(stageName, workingDir, pathReplace, ext = '.ts,.tsx,.js') {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set -e
            cd ${workingDir}
            rm -rf checkstyle/eslint
            mkdir -p checkstyle/eslint
            make node args='./node_modules/eslint/bin/eslint.js --quiet -f checkstyle -o checkstyle/eslint/eslint.xml src/. --ext ${ext}'
            sed -i -E 's#(<file.* name=")/var/www/[^/]+#\\1${pathReplace}#g' checkstyle/eslint/eslint.xml
        """
        def ret = recordIssues skipBlames: true, skipDeltaCalculation: true, skipPublishingChecks: true, sourceCodeRetention: 'NEVER',
            enabledForFailure: true, trendChartType: 'NONE', icon: 'userContent/eslint.svg',
            tools: [checkStyle(id: "${stageName}", name:"${stageValue}", pattern: "${workingDir}/checkstyle/eslint/*.xml")]
        if (ret.first().getTotalSize() != 0 || exitCode != 0) {
            error "Some code style rules failed, check output of step 'Execution' above, job reporting or job output"
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageLinterFront(stageName, workingDir) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        sh label: 'Execution', script: """#!/bin/bash
            set -e
            cd ${workingDir};
            make lint
        """
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageJest(stageName, workingDir, jestCmd, nodeArgs = '') {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf test-report.xml
            make node args='${nodeArgs} ${jestCmd}'
            exitCode=\$?
            sed -i -E 's#(<testcase.*classname=")(.+)#\\1${stageValue}.\\2#' test-report.xml
            exit \$exitCode
        """
        def ret = junit skipPublishingChecks: true, testResults: "${workingDir}/test-report.xml"
        if (ret.getPassCount() + ret.getSkipCount() != ret.getTotalCount() || exitCode != 0) {
            error "Some tests failed, check output of step 'Execution' above, job reporting or job output"
        } else {
            if (0 == ret.getPassCount()) {
                error "0 tests passed. quite surprising. please investigate :-)"
            }
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageChromatic(stageName, workingDir) {
    def stageValue=this."${stageName}"

    try {
        helper.commitStatus("${stageValue}", 'PENDING')
        sh label: 'Execution', script: """#!/bin/bash
            set -e
            cd ${workingDir}
            make storybook-upload args='--exit-once-uploaded --skip-update-check'
        """
        helper.commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            helper.commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageMakeTestWithReport(stageName, workingDir) {
    def stageValue=this."${stageName}"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def exitCode = sh label: 'Execution', returnStatus: true, script: """#!/bin/bash
            set +e
            cd ${workingDir}
            rm -rf test-report.xml
            make test-with-report
            exitCode=\$?
            sed -i -E 's#(<testcase.*classname=")(.+)#\\1${stageValue}.\\2#' test-report.xml
            exit \$exitCode
        """
        def ret = junit skipPublishingChecks: true, testResults: "${workingDir}/test-report.xml"
        if (ret.getPassCount() + ret.getSkipCount() != ret.getTotalCount() || exitCode != 0) {
            error "Some tests failed, check output of step 'Execution' above, job reporting or job output"
        } else {
            if (0 == ret.getPassCount()) {
                error "0 tests passed. quite surprising. please investigate :-)"
            }
        }
        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def stageCoverage(stageName, workingDir, coveragesSource = '', coveragePathFilter = '', bin = 'vendor/bin', neededGlobalCoverage = 80, neededFileCoverage = 70) {
    def stageValue=this."${stageName}"
    def lineDetails, baselineFile, file, url, coverage, executable, executed, notExecuted, coverageOk, executedOk
    def filesCoverageBaseline = [:], filesWithInsufficientCoverage = [], filesWithLowerCoverage = [], errorMessages = []
    def baseJenkinsURL = "http://dev-jenkins.alltricks.buzz:8081/job/${env.JOB_NAME}/${env.BUILD_NUMBER}/clover-report/current/##PATH##.html"

    try {
        commitStatus("${stageValue}", 'PENDING')
        def appDirName = new File(workingDir).getName()
        def coveragesFilteredDest = "coverage-filtered/${appDirName}", coveragesCompiledDest = "coverage-compiled/${appDirName}"
        sh label: 'Execution', script: """#!/bin/bash
            set -xe
            cd ${workingDir}
            if [[ "${coveragePathFilter}" != "" ]]; then
                make php args="${bin}/phpcov-filter phpunit.xml.dist ../../../shared/${coveragesSource} ../../../shared/${coveragesFilteredDest} ${coveragePathFilter}"
            fi
            make php args="vendor/bin/phpcov merge ../../../shared/${coveragesFilteredDest} --xml ../../../shared/${coveragesCompiledDest}/xml"
        """
        def coverageRatio = sh returnStdout: true, script:"""#!/bin/bash
            set -xe
            cd ${workingDir}
            grep '<directory name="/">' ../../../data/shared/${coveragesCompiledDest}/xml/index.xml -C 2 | grep lines | grep -oP '(?<=percent=")[[:digit:]]+\\.[[:digit:]]+'
        """
        def filesCoverageData = sh returnStdout: true, script:"""#!/bin/bash
            set -xe
            cd ${workingDir}/../../../data/shared/${coveragesCompiledDest}/xml
            rgrep --exclude=index.xml '<lines ' . | grep -v -E '<lines.+executable="0".+' | grep -v "TempCommand.php" | grep -v "Exception.php" | sed -E 's#^./([^:]+).xml:.+executable="([[:digit:]]+)" executed="([[:digit:]]+)" percent="([[:digit:]]+\\.[[:digit:]]+).+#\\1:\\4:\\2:\\3#'
        """
        def filesCoverageBaselineData = sh returnStdout: true, script:"""#!/bin/bash
            set -xe
            cat ${workingDir}/../../../data/shared/coverage-baseline/${appDirName}.txt
        """
        filesCoverageData = filesCoverageData.trim().split("\n") as List
        filesCoverageBaselineData = filesCoverageBaselineData.trim().split("\n") as List

        for (def i=filesCoverageBaselineData.size()-1; i>=0; i--) {
            lineDetails = filesCoverageBaselineData[i].split(':')

            baselineFile = appDirName + "/src/" + lineDetails[0].trim()
            filesCoverageBaseline[baselineFile] = [
              // Sub 0.01% to be sure to not have issue with float comparaison
              coverage: lineDetails[1].trim().toFloat() - 0.01,
              executable: lineDetails[2].trim().toInteger(),
              executed: lineDetails[3].trim().toInteger()
            ]
        }
        for (def i=filesCoverageData.size()-1; i>=0; i--) {
            lineDetails = filesCoverageData[i].split(':')
            file = appDirName + "/src/" + lineDetails[0].trim()
            url = baseJenkinsURL.replaceAll("##PATH##", file)
            coverage = lineDetails[1].trim().toFloat()
            executable = lineDetails[2].trim().toInteger()
            executed = lineDetails[3].trim().toInteger()
            notExecuted = executable - executed
            if(filesCoverageBaseline.containsKey(file)) {
                coverageOk = filesCoverageBaseline[file].coverage <= coverage
                executedOk = (filesCoverageBaseline[file].executable - filesCoverageBaseline[file].executed) >= notExecuted
                if(!coverageOk && !executedOk) {
                    filesWithLowerCoverage.push(
                        "[" + file + "](" + url + ") : " + coverage + "% and " + notExecuted + " lines not covered " +
                        "(initially " + filesCoverageBaseline[file].coverage + "% and " + (filesCoverageBaseline[file].executable - filesCoverageBaseline[file].executed) + " lines not covered)"
                    )
                }
            } else {
                if(neededFileCoverage > coverage) {
                    filesWithInsufficientCoverage.push("[" + file + "](" + url + ") : " + coverage + "%")
                }
            }
        }

        coverageRatio = coverageRatio.trim().toFloat()
        if (coverageRatio < neededGlobalCoverage) {
            errorMessages.push("${stageValue} has insufficient global coverage: ${coverageRatio}% (<${neededGlobalCoverage}%)")
        }
        if (filesWithInsufficientCoverage) {
            errorMessages.push("${stageValue} have files with insufficient coverage (<${neededFileCoverage}%):\n${filesWithInsufficientCoverage.join("\n")}")
        }
        if (filesWithLowerCoverage) {
            errorMessages.push("${stageValue} have files with coverage that is lower that baseline :\n${filesWithLowerCoverage.join("\n")}")
        }
        if(errorMessages) {
            def errorString = errorMessages.join("\n\n").replace("\n", "\\n")
            if (errorString.length() > 32768) {
                errorString = "Too many errors to display, please check the job output"
            }
            helperData.runtimeAutoActions['prAddComment'].add(
                ":warning::warning::warning: **Missing coverage on ${stageName}: ${workingDir}** :warning::warning::warning:\\n\\n${errorString}"
            )
            error(errorMessages.join("\n\n"))
        }

        commitStatus("${stageValue}", 'SUCCESS')
    } catch (Exception e) {
        catchError(message: "Error", buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            commitStatus("${stageValue}", 'ERROR')
            error e.toString()
        }
    }
}

def finalCiStatus(jenkinsActionsFile = 'jenkinsActions.csv'){
    def commitersMail = "", notFullyExecuted = false
    if (currentBuild.currentResult == 'ABORTED') {
        return
    }

    println "### Final state ###"
    println stagesTodo
    println stagesStatus

    stagesTodo.each {
        helper.commitStatus(this[it], 'ERROR', 'Not executed...')
        if (!stagesStatus[this[it]]) {
            println it + " not executed ? (" + stagesStatus[this[it]] + ")"
            notFullyExecuted = true
        }
    }

    commitersMail = sh returnStdout: true, script:"git log origin/${ghprbTargetBranch}..origin/${ghprbSourceBranch} --format=format:%ae | uniq | grep -v 'users.noreply.github.com' | tr '\n' ' '"
    echo "Emails : ${commitersMail}"

    if (notFullyExecuted) {
        currentBuild.result = 'FAILURE'
        helper.commitStatus("${stageGlobal}", 'ERROR', 'NO GO - Some stages not executed !')
    }else if (currentBuild.currentResult == 'SUCCESS') {
        helper.commitStatus("${stageGlobal}", 'SUCCESS', 'GO')
    } else if (currentBuild.currentResult == 'FAILURE') {
        helper.commitStatus("${stageGlobal}", 'ERROR', 'NO GO')
    } else if(currentBuild.currentResult == 'UNSTABLE') {
        currentBuild.result = 'FAILURE'
        helper.commitStatus("${stageGlobal}", 'ERROR', 'NO GO')
    }

    step([$class: 'Mailer', notifyEveryUnstableBuild: false, recipients: "${commitersMail}", sendToIndividuals: false])
    helper.stageAutoAction(jenkinsActionsFile)
}

return this
