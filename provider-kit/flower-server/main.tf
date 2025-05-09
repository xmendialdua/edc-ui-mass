provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "kubernetes_service" "superlink_0" {
  metadata {
    name      = "superlink-0"
    namespace = "flower"
  }
  spec {
    selector = {
      app = var.app_name
    }
    port {
      name        = "port-9092"
      protocol    = "TCP"
      port        = 9092
      target_port = 9092
    }
    port {
      name        = "port-9093"
      protocol    = "TCP"
      port        = 9093
      target_port = 9093
    }
  }
}

resource "kubernetes_deployment" "server_components" {
  metadata {
    name      = var.app_name
    namespace = "flower"
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = var.app_name
      }
    }
    template {
      metadata {
        labels = {
          app = var.app_name
        }
      }
      spec {
        container {
          name  = "flwr-superlink"
          image = var.superlink_image
          args  = ["--insecure", "--isolation", "process"]
          port {
            name          = "port-9091"
            container_port = 9091
          }
          port {
            name          = "port-9092"
            container_port = 9092
          }
          port {
            name          = "port-9093"
            container_port = 9093
          }
        }
        container {
          name  = "flwr-serverapp"
          image = var.serverapp_image
          args  = ["--insecure", "--serverappio-api-address", var.serverapp_api_address]
        }
      }
    }
  }
}

