# Primero definimos el ServiceAccount
resource "kubernetes_service_account" "model_apic_sa" {
  metadata {
    name      = "model-apic-sa"
    namespace = kubernetes_namespace.fl_api_consumer.metadata[0].name
  }
}
