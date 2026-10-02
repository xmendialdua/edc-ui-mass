"""
Genera diagrama de arquitectura: Dashboard poc_next ↔ SharePoint via Microsoft Graph API
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe

fig, ax = plt.subplots(1, 1, figsize=(22, 16))
ax.set_xlim(0, 22)
ax.set_ylim(0, 16)
ax.axis('off')
fig.patch.set_facecolor('#F0F4F8')

# ── Paleta de colores ──────────────────────────────────────────────────────────
C_FRONTEND  = '#1A56DB'   # Azul oscuro – componentes Next.js
C_BACKEND   = '#057A55'   # Verde oscuro – componentes FastAPI
C_GATEWAY   = '#9F580A'   # Naranja – gateway / auth
C_AZURE     = '#0078D4'   # Azul Microsoft – Azure AD / Graph
C_SHAREPOINT= '#217346'  # Verde SharePoint
C_EDGE      = '#6B21A8'   # Púrpura – EDC / Proxy
C_TITLE_BG  = '#1E293B'
C_BOX_BG    = '#FFFFFF'
C_BORDER    = '#CBD5E1'

# ── Helpers ───────────────────────────────────────────────────────────────────
def box(ax, x, y, w, h, label, sublabel=None, color='#1A56DB', alpha=0.92,
        fontsize=10, subsize=8, text_color='white', radius=0.35):
    """Dibuja un componente con cabecera coloreada y cuerpo blanco."""
    # Sombra
    shadow = FancyBboxPatch((x+0.07, y-0.07), w, h,
                            boxstyle=f"round,pad=0,rounding_size={radius}",
                            linewidth=0, facecolor='#00000020', zorder=2)
    ax.add_patch(shadow)
    # Fondo blanco
    bg = FancyBboxPatch((x, y), w, h,
                        boxstyle=f"round,pad=0,rounding_size={radius}",
                        linewidth=1.5, edgecolor=color, facecolor=C_BOX_BG, zorder=3)
    ax.add_patch(bg)
    # Cabecera coloreada
    header_h = h * 0.38
    hdr = FancyBboxPatch((x, y + h - header_h), w, header_h,
                         boxstyle=f"round,pad=0,rounding_size={radius}",
                         linewidth=0, facecolor=color, zorder=4)
    ax.add_patch(hdr)
    # Texto cabecera
    ax.text(x + w/2, y + h - header_h/2, label,
            ha='center', va='center', fontsize=fontsize, fontweight='bold',
            color=text_color, zorder=5, wrap=False)
    # Subtexto
    if sublabel:
        ax.text(x + w/2, y + h*0.25, sublabel,
                ha='center', va='center', fontsize=subsize, color='#475569',
                zorder=5, style='italic', wrap=False)

def section_bg(ax, x, y, w, h, title, color, alpha=0.07):
    """Zona de agrupación con borde y título."""
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0,rounding_size=0.5",
                          linewidth=2, edgecolor=color,
                          facecolor=color, alpha=alpha, zorder=1)
    ax.add_patch(rect)
    ax.text(x + 0.25, y + h - 0.28, title,
            fontsize=9, fontweight='bold', color=color, zorder=2,
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor=color, linewidth=1.2))

def arrow(ax, x1, y1, x2, y2, label='', color='#334155', lw=1.8,
          style='arc3,rad=0.0', fontsize=7.5, label_pos=0.5):
    """Flecha con etiqueta."""
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=lw,
                                connectionstyle=style),
                zorder=6)
    if label:
        mx = x1 + (x2-x1)*label_pos
        my = y1 + (y2-y1)*label_pos
        ax.text(mx, my, label, fontsize=fontsize, color=color, ha='center',
                va='center', zorder=7,
                bbox=dict(boxstyle='round,pad=0.18', facecolor='white',
                          edgecolor=color, linewidth=0.8, alpha=0.9))

def bidir_arrow(ax, x1, y1, x2, y2, label='', color='#334155', lw=1.8,
                style='arc3,rad=0.0', fontsize=7.5):
    """Flecha bidireccional."""
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='<->', color=color, lw=lw,
                                connectionstyle=style),
                zorder=6)
    if label:
        mx = (x1+x2)/2
        my = (y1+y2)/2
        ax.text(mx, my, label, fontsize=fontsize, color=color, ha='center',
                va='center', zorder=7,
                bbox=dict(boxstyle='round,pad=0.18', facecolor='white',
                          edgecolor=color, linewidth=0.8, alpha=0.9))

# ═══════════════════════════════════════════════════════════════════════════════
# TÍTULO
# ═══════════════════════════════════════════════════════════════════════════════
title_bg = FancyBboxPatch((0.3, 14.8), 21.4, 1.0,
                          boxstyle="round,pad=0,rounding_size=0.4",
                          linewidth=0, facecolor=C_TITLE_BG, zorder=3)
ax.add_patch(title_bg)
ax.text(11, 15.32, 'Arquitectura Dashboard poc_next — Integración SharePoint vía Microsoft Graph API',
        ha='center', va='center', fontsize=13, fontweight='bold', color='white', zorder=4)
ax.text(11, 14.97, 'Dashboard (Next.js + FastAPI)  ·  Azure AD  ·  Microsoft Graph API  ·  SharePoint Online',
        ha='center', va='center', fontsize=9, color='#94A3B8', zorder=4)

# ═══════════════════════════════════════════════════════════════════════════════
# ZONAS
# ═══════════════════════════════════════════════════════════════════════════════
# Frontend zone
section_bg(ax, 0.3, 8.8, 7.3, 5.7, '  FRONTEND  ·  Next.js / React', C_FRONTEND)
# Backend zone
section_bg(ax, 7.8, 6.2, 7.3, 8.3, '  BACKEND  ·  FastAPI  (puerto 5001)', C_BACKEND)
# Azure + SharePoint zone
section_bg(ax, 15.35, 6.2, 6.3, 8.3, '  MICROSOFT CLOUD', C_AZURE)

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENTES FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════
# data-publication/page.tsx
box(ax, 0.6, 12.4, 3.1, 1.7,
    'data-publication',
    'page.tsx',
    color=C_FRONTEND, fontsize=9, subsize=7.5)

# partner-data/page.tsx
box(ax, 4.1, 12.4, 3.1, 1.7,
    'partner-data',
    'page.tsx',
    color=C_FRONTEND, fontsize=9, subsize=7.5)

# SharePointPicker component
box(ax, 0.6, 10.2, 3.1, 1.7,
    'SharePointPicker',
    'components/sharepoint-picker.tsx',
    color='#1D4ED8', fontsize=8.5, subsize=7)

# lib/api.ts
box(ax, 4.1, 10.2, 3.1, 1.7,
    'api.ts  (lib)',
    'HTTP client — fetch()',
    color='#2563EB', fontsize=8.5, subsize=7)

# Phase components
box(ax, 1.6, 9.0, 4.7, 0.85,
    'Phase2 / Phase3 / Phase4 / Phase5 Content  (componentes de fases)',
    color='#3B82F6', fontsize=7.5, subsize=7, text_color='white')

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENTES BACKEND
# ═══════════════════════════════════════════════════════════════════════════════
# Routes: sharepoint.py
box(ax, 8.0, 12.4, 3.1, 1.7,
    'sharepoint.py',
    'api/routes  · /api/sharepoint/*',
    color=C_BACKEND, fontsize=8.5, subsize=7)

# Routes: sharepoint_proxy.py
box(ax, 11.7, 12.4, 3.1, 1.7,
    'sharepoint_proxy.py',
    'api/routes  · /api/sharepoint-proxy/*',
    color=C_EDGE, fontsize=8, subsize=7)

# SharePointGateway
box(ax, 8.0, 9.85, 3.1, 1.95,
    'SharePointGateway',
    'sharepoint_gateway/\nsharepoint_gateway.py',
    color=C_GATEWAY, fontsize=9, subsize=7.5)

# SharePointAuthService
box(ax, 11.7, 9.85, 3.1, 1.95,
    'SharePointAuthService',
    'sharepoint_gateway/\nsharepoint_auth.py',
    color=C_GATEWAY, fontsize=8.5, subsize=7.5)

# FastAPI App
box(ax, 9.2, 7.0, 2.5, 1.5,
    'main.py',
    'FastAPI App\nCORS · Routers',
    color='#065F46', fontsize=9, subsize=7.5)

# msal library
box(ax, 11.7, 7.0, 3.1, 1.5,
    'MSAL  (Python)',
    'Client Credentials Flow\nToken cache',
    color='#4B5563', fontsize=8.5, subsize=7.5)

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENTES MICROSOFT CLOUD
# ═══════════════════════════════════════════════════════════════════════════════
# Azure AD
box(ax, 15.55, 12.4, 5.8, 1.7,
    'Azure AD  /  Entra ID',
    'Token Endpoint  ·  Client Credentials\nApp Registration  ·  Admin Consent',
    color=C_AZURE, fontsize=9, subsize=7.5)

# Microsoft Graph API
box(ax, 15.55, 9.8, 5.8, 2.0,
    'Microsoft Graph API  v1.0',
    '/drives/{drive_id}/root/children\n/drives/{drive_id}/items/{id}/children\n/drives/{drive_id}/items/{id}/content',
    color='#0369A1', fontsize=9, subsize=7.2)

# SharePoint Online
box(ax, 15.55, 7.0, 5.8, 2.2,
    'SharePoint Online',
    'Document Library\nDrive  ·  Folders  ·  Files\nSite: ikerlan.sharepoint.com',
    color=C_SHAREPOINT, fontsize=9.5, subsize=7.5)

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — Frontend interno
# ═══════════════════════════════════════════════════════════════════════════════
# Pages → SharePointPicker / api.ts
arrow(ax, 2.15, 12.4, 2.15, 11.9, color=C_FRONTEND, lw=1.5)
arrow(ax, 4.65, 12.4, 5.65, 11.9, color=C_FRONTEND, lw=1.5)
arrow(ax, 3.7, 11.1, 4.1, 11.1, '', color='#3B82F6', lw=1.5)  # picker → api.ts

# Pages → Phase components
arrow(ax, 2.15, 12.4, 2.0, 9.85, '', color='#3B82F6', lw=1.3, style='arc3,rad=-0.15')
arrow(ax, 5.65, 12.4, 5.3, 9.85, '', color='#3B82F6', lw=1.3, style='arc3,rad=0.15')

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — Frontend → Backend   (HTTP REST)
# ═══════════════════════════════════════════════════════════════════════════════
bidir_arrow(ax, 7.2, 11.2, 8.0, 12.4,
            'GET /api/sharepoint/files\nGET /api/sharepoint/status\nGET /api/sharepoint/download/{id}',
            color='#334155', lw=2.0, style='arc3,rad=-0.1', fontsize=7.5)

bidir_arrow(ax, 7.2, 10.8, 11.7, 12.55,
            'GET /api/sharepoint-proxy/\ndownload/{base64(driveId|itemId)}',
            color=C_EDGE, lw=1.8, style='arc3,rad=0.3', fontsize=7.2)

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — Backend interno
# ═══════════════════════════════════════════════════════════════════════════════
# sharepoint.py → SharePointGateway
arrow(ax, 9.55, 12.4, 9.55, 11.8, 'instancia\nSharePointGateway', color=C_BACKEND, lw=1.8, fontsize=7)
# sharepoint_proxy.py → SharePointGateway
arrow(ax, 13.25, 12.4, 13.25, 11.8, 'instancia\nSharePointGateway', color=C_EDGE, lw=1.8, fontsize=7)

# Routes → get_gateway() → SharePointAuthService
arrow(ax, 9.55, 9.85, 12.25, 9.85, 'get_access_token()', color=C_GATEWAY, lw=1.8, fontsize=7)

# SharePointAuthService → MSAL
arrow(ax, 13.25, 9.85, 13.25, 8.5, 'acquire_token_for_client()', color='#4B5563', lw=1.8, fontsize=7)

# main.py registra routers
arrow(ax, 10.45, 8.5, 9.55, 12.4, '', color='#6B7280', lw=1.2, style='arc3,rad=0.3')

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — Backend → Azure AD
# ═══════════════════════════════════════════════════════════════════════════════
bidir_arrow(ax, 14.8, 8.5, 15.55, 13.25,
            'POST /oauth2/v2.0/token\nClient Credentials\naccess_token (JWT)',
            color=C_AZURE, lw=2.0, style='arc3,rad=-0.2', fontsize=7.2)

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — SharePointGateway → Microsoft Graph
# ═══════════════════════════════════════════════════════════════════════════════
bidir_arrow(ax, 15.0, 10.8, 15.55, 10.8,
            '',
            color='#0369A1', lw=2.2)

# Etiquetas detalladas de los endpoints que usa el Gateway
ax.text(15.25, 11.25,
        'Authorization: Bearer {access_token}\nGET /drives/{driveId}/root/children\nGET /drives/{driveId}/items/{id}/children\nGET /drives/{driveId}/items/{id}/content\nGET /drives/{driveId}/items/{id}?select=downloadUrl',
        fontsize=6.5, color='#0369A1', ha='center', va='bottom', zorder=7,
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#EFF6FF',
                  edgecolor='#0369A1', linewidth=1, alpha=0.95))

# ═══════════════════════════════════════════════════════════════════════════════
# FLECHAS — Microsoft Graph ↔ SharePoint
# ═══════════════════════════════════════════════════════════════════════════════
bidir_arrow(ax, 18.45, 9.8, 18.45, 9.2,
            '', color=C_SHAREPOINT, lw=2.2)

# ═══════════════════════════════════════════════════════════════════════════════
# LEYENDA de permisos
# ═══════════════════════════════════════════════════════════════════════════════
legend_x, legend_y = 0.35, 5.9
legend_bg = FancyBboxPatch((legend_x, legend_y), 10.8, 2.4,
                           boxstyle="round,pad=0,rounding_size=0.3",
                           linewidth=1.5, edgecolor='#CBD5E1',
                           facecolor='white', zorder=3)
ax.add_patch(legend_bg)
ax.text(legend_x + 5.4, legend_y + 2.1, 'Application Permissions  (Azure AD)',
        fontsize=9, fontweight='bold', color='#1E293B', ha='center', zorder=4)
perms = [
    ('Files.Read.All',    'Lectura de archivos en todos los drives'),
    ('Sites.Read.All',    'Acceso a sitios SharePoint sin usuario'),
    ('Files.ReadWrite.All','Creación de sharing links (optional)'),
]
for i, (perm, desc) in enumerate(perms):
    yp = legend_y + 1.6 - i * 0.55
    ax.text(legend_x + 0.4, yp, f'●  {perm}', fontsize=8.5, fontweight='bold',
            color=C_AZURE, zorder=4)
    ax.text(legend_x + 3.8, yp, f'—  {desc}', fontsize=8, color='#475569', zorder=4)

# ═══════════════════════════════════════════════════════════════════════════════
# LEYENDA de flujo numérico
# ═══════════════════════════════════════════════════════════════════════════════
flow_x, flow_y = 11.5, 5.9
flow_bg = FancyBboxPatch((flow_x, flow_y), 10.1, 2.4,
                         boxstyle="round,pad=0,rounding_size=0.3",
                         linewidth=1.5, edgecolor='#CBD5E1',
                         facecolor='white', zorder=3)
ax.add_patch(flow_bg)
ax.text(flow_x + 5.05, flow_y + 2.1, 'Flujo de acceso a SharePoint',
        fontsize=9, fontweight='bold', color='#1E293B', ha='center', zorder=4)
steps = [
    ('①', C_FRONTEND,  'UI solicita listado/descarga  →  api.ts llama GET /api/sharepoint/…'),
    ('②', C_BACKEND,   'Route sharepoint.py  →  get_gateway()  →  SharePointAuthService'),
    ('③', C_AZURE,     'MSAL: POST /oauth2/v2.0/token  →  Azure AD devuelve access_token (JWT)'),
    ('④', C_GATEWAY,   'SharePointGateway inyecta Bearer token y llama Microsoft Graph API'),
    ('⑤', C_SHAREPOINT,'Graph API lee/descarga archivos del Drive y los devuelve al frontend'),
]
for i, (num, color, text) in enumerate(steps):
    yf = flow_y + 1.7 - i * 0.42
    ax.text(flow_x + 0.3, yf, num, fontsize=9, fontweight='bold', color=color, zorder=4)
    ax.text(flow_x + 0.7, yf, text, fontsize=7.5, color='#334155', zorder=4)

# ═══════════════════════════════════════════════════════════════════════════════
# LEYENDA de colores
# ═══════════════════════════════════════════════════════════════════════════════
col_items = [
    (C_FRONTEND,   'Frontend  Next.js / React'),
    (C_BACKEND,    'Backend  FastAPI'),
    (C_GATEWAY,    'Gateway / Auth  (SharePoint)'),
    (C_AZURE,      'Azure AD  /  Graph API'),
    (C_SHAREPOINT, 'SharePoint Online'),
    (C_EDGE,       'SharePoint Proxy  (EDC)'),
]
cx, cy = 0.35, 4.9
for i, (color, label) in enumerate(col_items):
    xi = cx + i * 3.55
    patch = FancyBboxPatch((xi, cy), 0.5, 0.3,
                           boxstyle="round,pad=0,rounding_size=0.08",
                           facecolor=color, linewidth=0, zorder=3)
    ax.add_patch(patch)
    ax.text(xi + 0.65, cy + 0.15, label, fontsize=8, color='#334155', va='center', zorder=4)

# ═══════════════════════════════════════════════════════════════════════════════
# Nota EDC Proxy
# ═══════════════════════════════════════════════════════════════════════════════
note_bg = FancyBboxPatch((0.35, 3.5), 21.1, 1.15,
                         boxstyle="round,pad=0,rounding_size=0.3",
                         linewidth=1.5, edgecolor=C_EDGE,
                         facecolor='#FAF5FF', zorder=3)
ax.add_patch(note_bg)
ax.text(11, 4.35,
        '⚡  SharePoint Proxy  (/api/sharepoint-proxy/download/{base64(driveId|itemId)})',
        fontsize=9, fontweight='bold', color=C_EDGE, ha='center', zorder=4)
ax.text(11, 3.88,
        'El EDC DataPlane no puede autenticarse con OAuth 2.0. El proxy actúa como intermediario: '
        'recibe la petición del DataPlane, obtiene el token vía MSAL (Client Credentials) '
        'y descarga el archivo de SharePoint, sirviéndolo de vuelta al DataPlane.',
        fontsize=8, color='#4B5563', ha='center', va='center', zorder=4)

# ═══════════════════════════════════════════════════════════════════════════════
# Variables de entorno relevantes
# ═══════════════════════════════════════════════════════════════════════════════
env_bg = FancyBboxPatch((0.35, 0.2), 21.1, 3.05,
                        boxstyle="round,pad=0,rounding_size=0.3",
                        linewidth=1.5, edgecolor='#94A3B8',
                        facecolor='#F8FAFC', zorder=3)
ax.add_patch(env_bg)
ax.text(11, 3.05, 'Variables de entorno  (.env  backend)',
        fontsize=9, fontweight='bold', color='#1E293B', ha='center', zorder=4)
env_vars = [
    ('SHAREPOINT_DRIVE_ID',           'ID del drive SharePoint por defecto'),
    ('SHAREPOINT_PROXY_CLIENT_ID',    'Client ID de la App Registration en Azure AD'),
    ('SHAREPOINT_PROXY_CLIENT_SECRET','Client Secret de la App Registration'),
    ('SHAREPOINT_PROXY_TENANT_ID',    'Tenant ID del directorio Azure AD'),
    ('SHAREPOINT_PROXY_BASE_URL',     'URL base del proxy (ej. http://localhost:5001)'),
    ('SHAREPOINT_ALLOWED_FOLDER',     'Carpeta raíz permitida (ej. 05.Dataspace)'),
]
cols = 2
for i, (var, desc) in enumerate(env_vars):
    col = i % cols
    row = i // cols
    ex = 0.7 + col * 10.7
    ey = 2.6 - row * 0.7
    ax.text(ex, ey, f'{var}', fontsize=7.8, fontweight='bold',
            color='#1E293B', zorder=4,
            bbox=dict(boxstyle='round,pad=0.18', facecolor='#E2E8F0',
                      edgecolor='#94A3B8', linewidth=0.8))
    ax.text(ex + 4.4, ey, f'  {desc}', fontsize=7.8, color='#475569', zorder=4)

plt.tight_layout(pad=0)
output_path = '/home/xmendialdua/projects/assembly/iflex/sharepoint-architecture-diagram.jpg'
plt.savefig(output_path, dpi=180, format='jpeg',
            bbox_inches='tight', facecolor=fig.get_facecolor())
print(f"Diagrama guardado en: {output_path}")
