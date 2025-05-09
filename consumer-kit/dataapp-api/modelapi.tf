# Definimos el Deployment para la API
resource "kubernetes_deployment" "model_apic" {
  metadata {
    name      = "model-apic"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
    labels = {
      app = "model-apic"
    }
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "model-apic"
      }
    }
    template {
      metadata {
        labels = {
          app = "model-apic"
        }
      }
      spec {
        # Aseguramos que el ServiceAccount pertenece al mismo namespace
        service_account_name = kubernetes_service_account.model_apic_sa.metadata[0].name

        container {
          name  = "model-apic"
          image = "jalvaro8/fl-api:cons"
          image_pull_policy = "Always"
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
resource "kubernetes_service" "model_apic_service" {
  metadata {
    name      = "model-apic-service"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }
  spec {
    selector = {
      app = "model-apic"
    }
    port {
      protocol    = "TCP"
      port        = 380
      target_port = 380
      node_port   = 30381
    }
    type = "NodePort"
  }
}
