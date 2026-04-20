"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from typing import Dict, List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """POC Next Backend API settings.

    All values are loaded from environment variables or a .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Application ---
    app_host: str = "0.0.0.0"
    app_port: int = 5001  # Changed from 5000 to avoid conflict with original POC
    log_level: str = "INFO"

    # --- MASS Connector (Provider) ---
    mass_management_url: str = "https://edc-mass-control.51.178.94.25.nip.io/management"
    mass_api_key: str = "mass-api-key-change-in-production"
    mass_bpn: str = "BPNL00000000MASS"
    mass_dsp: str = "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"

    # --- IKLN Connector (Consumer) ---
    ikln_management_url: str = "https://edc-ikln-control.51.178.94.25.nip.io/management"
    ikln_api_key: str = "ikln-api-key-change-in-production"
    ikln_bpn: str = "BPNL00000002IKLN"
    ikln_dsp: str = "https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp"

    # --- Kubernetes ---
    kubeconfig_path: str | None = None

    # --- Sample Data ---
    pdf_url: str = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Find kubeconfig if not explicitly set
        if not self.kubeconfig_path:
            self.kubeconfig_path = self._find_kubeconfig()

    def _find_kubeconfig(self) -> str:
        """Find kubeconfig in multiple locations."""
        candidates = [
            os.environ.get('KUBECONFIG'),
            Path(__file__).parent / 'kubeconfig.yaml',
            Path(__file__).parent.parent / 'kubeconfig.yaml',
            Path(__file__).parent.parent.parent.parent / 'dashboard' / 'kubeconfig.yaml',
            Path.home() / '.kube' / 'config'
        ]

        for path in candidates:
            if path and Path(path).exists():
                return str(path)

        # Default to dashboard kubeconfig
        return str(Path(__file__).parent.parent.parent.parent / 'dashboard' / 'kubeconfig.yaml')


settings = Settings()
