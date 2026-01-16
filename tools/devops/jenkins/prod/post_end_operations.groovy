def _manager

void buildEndOperations(manager) {
  _manager = manager

  _manager.listener.logger.println "\n\n####################################"
  _manager.listener.logger.println "####### Build end operations #######"
  _manager.listener.logger.println "####################################"

  if(!_manager.envVars.containsKey('duration_threshold')){
    _manager.listener.logger.println "Use default value on duration_threshold"
    _manager.envVars['duration_threshold'] = '86400'
  }
  if(!_manager.envVars.containsKey('discord_alert')){
    _manager.listener.logger.println "Use default value on discord_alert"
    _manager.envVars['discord_alert'] = 'true'
  }
  if(!_manager.envVars.containsKey('discord_alert_on_repetition')){
    _manager.listener.logger.println "Use default value on discord_alert_on_repetition"
    _manager.envVars['discord_alert_on_repetition'] = 'true'
  }
  if(!_manager.envVars.containsKey('discord_alert_is_critical')){
    _manager.listener.logger.println "Use default value on discord_alert_is_critical"
    _manager.envVars['discord_alert_is_critical'] = 'false'
  }

  _log()
  _removePodOnAbort()
}

void _log() {
  builds = jenkins.model.Jenkins.instance.getJob(_manager.envVars['JOB_NAME']).getBuilds()
  currentDuration = _getAndSetCurrentDuration()
  exitCode = _getExitCode()
  errorChain = _isErrorChain(builds)
  isSlow = _isSlow(builds)

  log=[
    "echo",
    "-n",
    "{\"log_source\":\"jenkins\",\"message\":\"Stop ${_manager.envVars['JOB_NAME']}\",\"job\":\"${_manager.envVars['JOB_NAME']}\",\"state\":\"stop\",\"duration\":${currentDuration},\"build\":\"${_manager.envVars['BUILD_URL']}\",\"exit_code\":${exitCode},\"chain\":${errorChain}, \"alert\":${_manager.envVars['discord_alert']}, \"alert_on_repetition\":${_manager.envVars['discord_alert_on_repetition']}, \"alert_is_critical\":${_manager.envVars['discord_alert_is_critical']},\"slow\":${isSlow}}",
  ]
  log2=[
    "nc",
    "-4u",
    "-w1",
    "localhost",
    "8085",
  ]

  _manager.listener.logger.println "\n======= Send log ======="
  _manager.listener.logger.println log
  println log.execute()|log2.execute()
}

void _removePodOnAbort() {
  if(_manager.logContains(".*Build was aborted.*")) {
    logMatcher = _manager.getLogMatcher(".*Job name : ([a-z0-9-]*).*")

    if (logMatcher?.matches()) {
      _manager.listener.logger.println "\n======= Build abort, remove pod ======="

      jobIdentifier = logMatcher.group(1)

      proc = new ProcessBuilder('/bin/sh', '-c', "export KUBECONFIG=kube.conf && gcloud container clusters get-credentials ${_manager.envVars['gcp_cluster']} --zone europe-west1-b --project ${_manager.envVars['gcp_project']} --account jenkins-compute-prod@avanis-infra-gke.iam.gserviceaccount.com && kubectl delete jobs/$jobIdentifier -n ${_manager.envVars['kube_namespace']}").start();
      proc.waitFor()

      if (proc.exitValue()) {
        _manager.listener.logger.println "Error deleting job : " + proc.err.text
        _manager.listener.logger.println "Go to https://console.cloud.google.com/kubernetes/job/europe-west1-b/${_manager.envVars['gcp_cluster']}/${_manager.envVars['kube_namespace']}/$jobIdentifier/details?project=${_manager.envVars['gcp_project']}&pageState=(%22savedViews%22:(%22i%22:%22fb0e256129f3409abdf167d44fec83cb%22,%22c%22:%5B%5D,%22n%22:%5B%22${_manager.envVars['kube_namespace']}%22%5D)) for more informations."
      } else {
        _manager.listener.logger.println "Ok; job  is deleted with output : " + proc.text
      }
    }
  }
}

int _getExitCode() {
  logMatcher = _manager.getLogMatcher('^.*Execution exit code is : ([0-9]+).*$')
  if (logMatcher?.matches()) {
    return Integer.parseInt(logMatcher.group(1))
  }
  if(_manager.build.result.toString() != 'SUCCESS') {
    return 999
  }

  return 0
}

float _getAndSetCurrentDuration() {
  _manager.build.duration = System.currentTimeMillis() - _manager.build.getStartTimeInMillis()

  return Math.round(_manager.build.duration / 1000)
}

boolean _isErrorChain(builds) {
  errorChain = false
  if (builds.size() > 5) {
    errorChain = true
    for (int i in 0..4) {
      if (builds[i].result.toString() == "SUCCESS") {
        errorChain = false
      }
    }
  }

  return errorChain
}

boolean _isSlow(builds) {
  _manager.listener.logger.println "\n======= Check duration ======="
  nbBuildsToCheck = 3
  nbBuildsForAverage = 20
  nbBuildsNeeded = (nbBuildsForAverage + nbBuildsToCheck + 2)
  min = 99999999
  max = 0
  sum = 0
  average = 0
  threshold = 0
  isSlow = false
  threshold = Integer.parseInt(_manager.envVars['duration_threshold']) * 1000
  if (threshold != 0 ) {
    _manager.listener.logger.println _manager.envVars['JOB_NAME'] +
      "  Threshold: " + _convertTime(threshold) +
      "  Current: " + _convertTime(_manager.build.duration)
  } else if (builds.size() >= nbBuildsNeeded) {
    for (int i in nbBuildsToCheck..nbBuildsForAverage + nbBuildsToCheck - 1) {
      build = builds[i]
      duration = build.duration.floatValue()
      min = Math.min(min, duration)
      max = Math.max(max, duration)
      sum = sum + duration
    }
    average = (sum - min - max) / (nbBuildsForAverage - 2)
    threshold = average + average * 20 / 100
    if (threshold < 60 * 1000) {
      threshold = 60 * 1000
    }
    _manager.listener.logger.println _manager.envVars['JOB_NAME'] +
      "  Min: " + _convertTime(min) +
      "  Max: " + _convertTime(max) +
      "  Average: " + _convertTime(average) +
      "  Threshold: " + _convertTime(threshold) +
      "  Current: " + _convertTime(_manager.build.duration)
  }
  if (threshold != 0 && builds.size() >= nbBuildsToCheck){
    isSlow = true
    for (int j in 0..(nbBuildsToCheck - 1)) {
      _manager.listener.logger.println "Build #" + builds[j].number + ": " + _convertTime(builds[j].duration)
      if (builds[j].duration < threshold) {
        isSlow = false
        break
      }
    }
  }

  return isSlow
}

String _convertTime(time) {
  minutes = (int) Math.floor(time / 1000 / 60)
  seconds = (int) Math.floor((time - (minutes * 60 * 1000)) / 1000)

  return minutes + "m" + seconds + "s"
}
