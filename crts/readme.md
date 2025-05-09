# get-new-certs.bash Script

This script automates the process of generating SSL/TLS certificates for a specific subdomain using Certbot and managing Kubernetes ingress to avoid conflicts during the certificate generation process.

## Prerequisites

Before using this script, ensure the following:

1. **Certbot**: Certbot must be installed on your system. You can install it using your package manager:
```bash
   sudo apt update
   sudo apt install certbot
```

2. **MicroK8s**: MicroK8s must be installed and configured on your system. The script uses MicroK8s to manage Kubernetes ingress.

3. **Sudo Access**: The script requires sudo privileges to copy certificate files and modify permissions.

4. **Domain Configuration**: Ensure that the subdomain you are generating the certificate for is properly configured in your DNS to point to the server running this script.

# Usage
To use the script, follow these steps:

1. Open a terminal and navigate to the directory containing the get-new-certs.bash script:

```bash
cd /path/to/CRTS
```

2. Run the script with the desired subdomain as an argument:

Replace <subdomain> with the subdomain for which you want to generate the certificate. For example:

```bash
./get-new-certs.bash control-plane-connector123 # dataspace-ikerlan.es will be added automatically
```


This will generate a certificate for control-plane-connector123.dataspace-ikerlan.es.

# What the Script Does
1. **Disables Kubernetes Ingress**: Temporarily disables Kubernetes ingress to avoid conflicts with Certbot's standalone server.

2. **Runs Certbot**: Uses Certbot to generate SSL/TLS certificates for the specified subdomain.

3. **Copies Certificates**: Copies the generated certificate and private key to a directory named after the subdomain.

3. **Sets Permissions**: Sets the permissions of the copied files to 777 for easy access.

4. **Re-enables Kubernetes Ingress**: Re-enables Kubernetes ingress after the certificate generation process is complete.

# Output
If successful, the script will:

- Print a success message.
- Copy the generated certificate (<fullchain.pem>) and private key (<privkey.pem>) to a directory named after the subdomain (e.g., `./control-plane-connector123`).
If unsuccessful, the script will print an error message and exit.

# Example
- To generate a certificate for the subdomain <test.dataspace-ikerlan.es>:

```bash
./get-new-certs.bash test
```

- After running the script, the certificates will be available in the `./test` directory.

# Notes
Ensure that the DNS for the subdomain is correctly configured before running the script.
The script modifies Kubernetes ingress settings. Use it with caution in a production environment.
The permissions for the copied certificate files are set to 777. Adjust these permissions as needed for your use case.
Troubleshooting
If the script fails to disable Kubernetes ingress, ensure that MicroK8s is installed and running.
If Certbot fails, verify that the subdomain is correctly configured in your DNS and accessible from the server.