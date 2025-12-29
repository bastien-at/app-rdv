To install

- Create a static IP https://console.cloud.google.com/networking/addresses/list (premium global)
  Give name to ingress annotation `kubernetes.io/ingress.global-static-ip-name` (example `kubernetes.io/ingress.global-static-ip-name: "ingress-gce-images"`)
- Create DNS entry type A
- Check "http loadbalancer" option is enabled on cluster
- Create a service account https://console.cloud.google.com/iam-admin/serviceaccounts
  Add workload identity user on it on `NAMESPACE/SERVICE` (by default `images/images`)
  Use it in service account annotation `iam.gke.io/gcp-service-account`
  ```bash
  gcloud iam service-accounts add-iam-policy-binding \
    SERVICE_ACCOUNT_NAME \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_NAME.svc.id.goog[NAMESPACE/SERVICE]" \
    --project PROJECT_NAME
  ```
- Create a bucket, no public access, no object permissions
  Add role storage object reader on above service account
- Add a DNS entry "media/image.domain.tld" to CDN in Google Cloud DNS for staging env (strio/qualif) or "Synalabs DNS" for prod
