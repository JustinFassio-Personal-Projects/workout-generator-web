## Firestore provisioning (Terraform)

This folder provisions Firestore for the Firebase/GCP project **`ai-workout-generator-hub`**.

### What it does

- Enables required APIs:
  - `firestore.googleapis.com`
  - `firebaserules.googleapis.com`
- Creates the `(default)` Firestore database in **`us-central1`** as **Native mode** (`FIRESTORE_NATIVE`)

### Safety notes

- Firestore **location** and **mode** are effectively permanent once created. Double-check before applying.
- Consider configuring a **remote Terraform state backend** in [`backend.tf`](backend.tf) so state isn't tied to one laptop.

### Runbook

From this directory:

```bash
terraform init
terraform plan
terraform apply
```
