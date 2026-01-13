{{/*
Expand the name of the chart.
*/}}
{{- define "name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "labels" -}}
helm.sh/chart: {{ include "chart" . }}
{{ include "selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- include "customLabels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "selectorLabels" -}}
app.kubernetes.io/name: {{ include "name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- with .Values.customSelectorLabels }}
  {{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "customLabels" -}}
{{- with .Values.labels }}
  {{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}

{{/*
Render a template from values
*/}}
{{- define "tplvaluesRender" -}}
    {{- if typeIs "string" .value }}
        {{- tpl .value .context }}
    {{- else }}
        {{- tpl (.value | toYaml) .context }}
    {{- end }}
{{- end -}}

{{/*
Get blue/green value to deploy
*/}}
{{- define "blueGreenToDeploy" -}}
    {{- if and (eq .Values.blueGreen.color "blue") (eq .Values.blueGreen.phase "clean") }}
        {{- "green" }}
    {{- else if and (eq .Values.blueGreen.color "green") (eq .Values.blueGreen.phase "clean") }}
        {{- "blue" }}
    {{- else }}
        {{- printf "%s" .Values.blueGreen.color -}}
    {{- end }}
{{- end -}}

{{/*
Get current blue/green (inverse of color to deploy)
*/}}
{{- define "blueGreenToTrafficCdn" -}}
    {{- if and (eq .Values.blueGreen.color "blue") (eq .Values.blueGreen.phase "deploy") }}
        {{- "green" }}
    {{- else if and (eq .Values.blueGreen.color "green") (eq .Values.blueGreen.phase "deploy") }}
        {{- "blue" }}
    {{- else }}
        {{- printf "%s" .Values.blueGreen.color -}}
    {{- end }}
{{- end -}}

{{/*
Get current blue/green (inverse of color to deploy)
*/}}
{{- define "blueGreenToTrafficApp" -}}
    {{- if and (eq .Values.blueGreen.color "blue") (eq .Values.blueGreen.phase "deploy") }}
        {{- "green" }}
    {{- else if and (eq .Values.blueGreen.color "green") (eq .Values.blueGreen.phase "deploy") }}
        {{- "blue" }}
    {{- else if and (eq .Values.blueGreen.color "blue") (eq .Values.blueGreen.phase "switch-cdn") }}
        {{- "green" }}
    {{- else if and (eq .Values.blueGreen.color "green") (eq .Values.blueGreen.phase "switch-cdn") }}
        {{- "blue" }}
    {{- else }}
        {{- printf "%s" .Values.blueGreen.color -}}
    {{- end }}
{{- end -}}