variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "flower-server-0"
}

variable "superlink_image" {
  description = "Image for the superlink container"
  type        = string
  default     = "flwr/superlink:1.13.1"
}

variable "serverapp_image" {
  description = "Image for the server app container"
  type        = string
  default     = "jalvaro8/serverapp:latest"
}

variable "serverapp_api_address" {
  description = "API address for the server app"
  type        = string
  default     = "localhost:9091"
}
