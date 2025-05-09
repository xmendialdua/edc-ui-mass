# ClusterRole para permisos globales sobre pods
resource "kubernetes_cluster_role" "model_apic_cluster_role" {
  metadata {
    name = "model-apic-cluster-role"
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list"]
  }
}

# ClusterRoleBinding para asociar el ClusterRole con el ServiceAccount
resource "kubernetes_cluster_role_binding" "model_apic_cluster_role_binding" {
  metadata {
    name = "model-apic-cluster-role-binding"
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }

  role_ref {
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.model_apic_cluster_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}
resource "kubernetes_cluster_role" "mlflow_cluster_role" {
  metadata {
    name = "mlflow-cluster-role"
  }

  rule {
    api_groups = ["", "apps", "networking.k8s.io", "policy"]
    resources  = ["services", "deployments", "persistentvolumeclaims", "configmaps", "serviceaccounts", "networkpolicies", "poddisruptionbudgets", "statefulsets"]
    verbs      = ["get", "list", "create", "update", "delete", "patch"]
  }
}
resource "kubernetes_cluster_role_binding" "mlflow_cluster_role_binding" {
  metadata {
    name = "mlflow-cluster-rolebinding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.mlflow_cluster_role.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apic_sa.metadata[0].name
    namespace = "fl-api-consumer"
  }
}
