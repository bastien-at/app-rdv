# Generic helm charts for Avanis

## Chart *generic-application* & shared config files

To shared config files, create a template outside the *subchart* is required for security limitation (it's not possible to use `.File.Get` to retrieve file contents from the parent chart).
Create a helm template is required to configure the chart; with a template like *templates/onfigmap-config-file.yaml* :

```yaml
{{- if .Values.global.configFiles -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ template "fullname" . }}-config-files
data:
  {{- range $name, $value := .Values.global.configFiles }}
  {{ $name }}: |+
    {{- $.Files.Get $value.localPath | nindent 4 }}
  {{- end }}
{{- end }}
```
And configure it in *values.yaml* with `global` values :

```yaml
global:
  configFiles:
    default.vcl.tpl:
      localPath: config_files/default.vcl.tpl
      mountPath: /etc/varnish/default.vcl.tpl
      subPath: default.vcl.tpl
```

`global.configFiles` is also used to autoconfigure `volumes` and `volumeMount` (cf. *generic-application/charts/deployments.yaml*).
