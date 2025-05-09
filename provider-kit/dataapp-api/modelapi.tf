### modelapi.tf ###

# Primero definimos el ServiceAccount
resource "kubernetes_service_account" "model_apip_sa" {
  metadata {
    name      = "model-apip-sa"
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }
}

# Luego definimos el Deployment
resource "kubernetes_deployment" "model_apip" {
  metadata {
    name      = "model-apip"
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
    labels = {
      app = "model-apip"
    }
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "model-apip"
      }
    }
    template {
      metadata {
        labels = {
          app = "model-apip"
        }
      }
      spec {
        service_account_name = kubernetes_service_account.model_apip_sa.metadata[0].name  # Asignación del ServiceAccount
        container {
          name  = "model-apip"
          image = "jalvaro8/fl-api:prov"
          image_pull_policy = "Always"  # Sino hay veces que no carga las imagenes
          port {
            container_port = 380
          }
          env {
            name  = "MLFLOW_TRACKING_URI"
            value = "http://172.19.0.2:30021"
          }
        }
      }
    }
  }
}

# Definimos el Service para exponer el pod
resource "kubernetes_service" "model_apip_service" {
  metadata {
    name      = "model-apip-service"
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }
  spec {
    selector = {
      app = "model-apip"
    }
    port {
      protocol    = "TCP"
      port        = 380
      target_port = 380
      node_port   = 30380 # Puerto expuesto en el nodo (entre 30000-32767)
    }
    type = "NodePort"
  }
}

# Role con permisos sobre pods
resource "kubernetes_role" "model_apip_role" {
  metadata {
    name      = "model-apip-role"
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["create", "get", "list", "delete"]
  }
}

# RoleBinding para asociar el Role al ServiceAccount
resource "kubernetes_role_binding" "model_apip_role_binding" {
  metadata {
    name      = "model-apip-role-binding"
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apip_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apip_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

resource "kubernetes_role" "model_apip_role_flower" {
  metadata {
    name      = "model-apip-role-flower"
    namespace = "flower"
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["create", "get", "list", "delete"]
  }
}

resource "kubernetes_role_binding" "model_apip_role_binding_flower" {
  metadata {
    name      = "model-apip-role-binding-flower"
    namespace = "flower"
  }

  subject {
    kind      = "ServiceAccount"
    name      = "model-apip-sa"
    namespace = "fl-api-provider"
  }

  role_ref {
    kind      = "Role"
    name      = kubernetes_role.model_apip_role_flower.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

resource "kubernetes_cluster_role" "model_apip_cluster_role" {
  metadata {
    name = "model-apip-cluster-role"
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_cluster_role_binding" "model_apip_cluster_role_binding" {
  metadata {
    name = "model-apip-cluster-role-binding"
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.model_apip_sa.metadata[0].name
    namespace = kubernetes_namespace.fl_api_provider.metadata[0].name
  }

  role_ref {
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.model_apip_cluster_role.metadata[0].name
    api_group = "rbac.authorization.k8s.io"
  }
}

