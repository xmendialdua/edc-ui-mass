# ====================================================================| PERMISOS DE LA API |====================================================================
# Role con permisos sobre pods para la API
resource "kubernetes_role" "model_apic_role" {
  metadata {
    name      = "model-apic-role"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["create", "get", "list", "delete"]
  }
}

# RoleBinding para asociar el Role al ServiceAccount para la API
resource "kubernetes_role_binding" "model_apic_role_binding" {
  metadata {
    name      = "model-apic-role-binding"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

# ====================================================================| PERMISOS DE FLOWER |====================================================================
# Role con permisos sobre pods para Flower
resource "kubernetes_role" "model_apic_role_flower" {
  metadata {
    name      = "model-apic-role-flower"
    namespace = "flower"
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["create", "get", "list", "delete"]
  }
}

# RoleBinding para asociar el Role al ServiceAccount para Flower
resource "kubernetes_role_binding" "model_apic_role_binding_flower" {
  metadata {
    name      = "model-apic-role-binding-flower"
    namespace = "flower"
  }

  subject {
    kind      = "ServiceAccount"
    name      = "model-apic-sa"
    namespace = "fl-api-consumer"
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_role_flower.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

# ====================================================================| PERMISOS DE MLFLOW |====================================================================
# Role con permisos sobre pods, deployments y services para MLflow
resource "kubernetes_role" "model_apic_mlflow_role" {
  metadata {
    name      = "model-apic-mlflow-role"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "deployments", "services"]
    verbs      = ["create", "get", "list", "update", "delete"]
  }
}

# RoleBinding para asociar el Role al ServiceAccount para MLflow
resource "kubernetes_role_binding" "model_apic_mlflow_role_binding" {
  metadata {
    name      = "model-apic-mlflow-role-binding"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

# Role para acceso a secretos en el namespace mlflow
resource "kubernetes_role" "model_apic_mlflow_secrets_role" {
  metadata {
    name      = "model-apic-mlflow-secrets-role"
    namespace = "mlflow"
  }

  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "create"]
  }
}

# RoleBinding para asociar el Role al ServiceAccount model-apic-sa en el namespace mlflow
resource "kubernetes_role_binding" "model_apic_mlflow_secrets_role_binding" {
  metadata {
    name      = "model-apic-mlflow-secrets-role-binding"
    namespace = "mlflow"
  }

  subject {
    kind      = "ServiceAccount"
    name      = "model-apic-sa"
    namespace = "fl-api-consumer"
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_secrets_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
# Role para permitir acceso a NetworkPolicies en el namespace mlflow
resource "kubernetes_role" "model_apic_mlflow_networkpolicy_role" {
  metadata {
    name      = "model-apic-mlflow-networkpolicy-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["networkpolicies"]
    verbs      = ["get", "list"]
  }
}

# RoleBinding para asociar el Role de NetworkPolicy al ServiceAccount
resource "kubernetes_role_binding" "model_apic_mlflow_networkpolicy_role_binding" {
  metadata {
    name      = "model-apic-mlflow-networkpolicy-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_networkpolicy_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_pdb_role" {
  metadata {
    name      = "model-apic-mlflow-pdb-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = ["policy"]
    resources  = ["poddisruptionbudgets"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_pdb_role_binding" {
  metadata {
    name      = "model-apic-mlflow-pdb-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_pdb_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_sa_role" {
  metadata {
    name      = "model-apic-mlflow-sa-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["serviceaccounts"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_sa_role_binding" {
  metadata {
    name      = "model-apic-mlflow-sa-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_sa_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_configmap_role" {
  metadata {
    name      = "model-apic-mlflow-configmap-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_configmap_role_binding" {
  metadata {
    name      = "model-apic-mlflow-configmap-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_configmap_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_pvc_role" {
  metadata {
    name      = "model-apic-mlflow-pvc-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["persistentvolumeclaims"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_pvc_role_binding" {
  metadata {
    name      = "model-apic-mlflow-pvc-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_pvc_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_service_role" {
  metadata {
    name      = "model-apic-mlflow-service-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["services"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_service_role_binding" {
  metadata {
    name      = "model-apic-mlflow-service-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_service_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_deployment_role" {
  metadata {
    name      = "model-apic-mlflow-deployment-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_deployment_role_binding" {
  metadata {
    name      = "model-apic-mlflow-deployment-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_deployment_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "model_apic_mlflow_postgresql_statefulset_role" {
  metadata {
    name      = "model-apic-mlflow-postgresql-statefulset-role"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  rule {
    api_groups = ["apps"]
    resources  = ["statefulsets"]
    verbs      = ["get", "list"]
  }
}
resource "kubernetes_role_binding" "model_apic_mlflow_postgresql_statefulset_role_binding" {
  metadata {
    name      = "model-apic-mlflow-postgresql-statefulset-role-binding"
    namespace = kubernetes_namespace.mlflow.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apic_mlflow_postgresql_statefulset_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_role" "mlflow_role" {
  metadata {
    name      = "mlflow-role"
    namespace = "mlflow"
  }

  rule {
    api_groups = [""]
    resources  = ["services", "persistentvolumeclaims", "configmaps", "serviceaccounts"]
    verbs      = ["get", "list", "create", "update", "delete", "patch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "statefulsets"]
    verbs      = ["get", "list", "create", "update", "delete", "patch"]
  }

  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["networkpolicies"]
    verbs      = ["get", "list", "create", "update", "delete", "patch"]
  }

  rule {
    api_groups = ["policy"]
    resources  = ["poddisruptionbudgets"]
    verbs      = ["get", "list", "create", "update", "delete", "patch"]
  }
}
resource "kubernetes_role_binding" "mlflow_rolebinding" {
  metadata {
    name      = "mlflow-rolebinding"
    namespace = "mlflow"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.mlflow_role.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = "fl-api-consumer"
  }
}
resource "kubernetes_role" "mlflow_job_manager" {
  metadata {
    name      = "mlflow-job-manager"
    namespace = "mlflow"
  }
  rule {
    api_groups = ["batch"]
    resources  = ["jobs"]
    verbs      = ["create", "delete", "get", "list", "watch"]
  }
}

resource "kubernetes_role_binding" "mlflow_job_binding" {
  metadata {
    name      = "mlflow-job-binding"
    namespace = "mlflow"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.mlflow_job_manager.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = "model-apic-sa"
    namespace = "fl-api-consumer"
  }
}
