"""Partners routes - Authentication and partner management."""

import asyncpg
import logging
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partners", tags=["Partners"])

# Portal database configuration
# In production (Kubernetes), use internal service name
# In development (localhost), use port-forwarded localhost:5433
PORTAL_DB_CONFIG = {
    "host": os.environ.get("PORTAL_DB_HOST", "localhost"),
    "port": int(os.environ.get("PORTAL_DB_PORT", "5433")),
    "database": os.environ.get("PORTAL_DB_NAME", "postgres"),
    "user": os.environ.get("PORTAL_DB_USER", "portal"),
    "password": os.environ.get("PORTAL_DB_PASSWORD", "dbpasswordportal")
}

# Hardcoded password for this iteration (as per requirement)
PARTNERS_PASSWORD = "1234"


class PartnerInfo(BaseModel):
    """Partner information model."""
    email: EmailStr
    firstname: str
    lastname: str
    company_name: str
    bpn: str


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response model."""
    success: bool
    message: str
    partner: Optional[PartnerInfo] = None


class PartnerDetails(BaseModel):
    """Detailed partner information including connector."""
    email: EmailStr
    firstname: str
    lastname: str
    company_name: str
    bpn: str
    management_url: str
    dsp_url: str


async def get_db_connection():
    """Get PostgreSQL connection to portal database."""
    try:
        conn = await asyncpg.connect(**PORTAL_DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Error connecting to portal database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


def convert_dsp_to_management_url(dsp_url: str) -> str:
    """Convert DSP URL to Management API URL.
    
    Example:
        https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp
        -> https://edc-ikln-control.51.178.94.25.nip.io/management
    """
    if not dsp_url:
        return ""
    
    # Remove /api/v1/dsp suffix and add /management
    base_url = dsp_url.replace("/api/v1/dsp", "")
    return f"{base_url}/management"


@router.get("/list", response_model=List[PartnerInfo])
async def list_partners() -> List[PartnerInfo]:
    """Get list of all registered partners from portal database."""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT 
                cu.email,
                cu.firstname,
                cu.lastname,
                c.name as company_name,
                c.business_partner_number as bpn
            FROM portal.company_users cu
            JOIN portal.identities i ON cu.id = i.id
            JOIN portal.companies c ON i.company_id = c.id
            WHERE cu.email IS NOT NULL
              AND c.business_partner_number IS NOT NULL
            ORDER BY c.name
        """
        
        rows = await conn.fetch(query)
        
        partners = [
            PartnerInfo(
                email=row['email'],
                firstname=row['firstname'] or '',
                lastname=row['lastname'] or '',
                company_name=row['company_name'],
                bpn=row['bpn']
            )
            for row in rows
        ]
        
        logger.info(f"Retrieved {len(partners)} partners from portal database")
        return partners
        
    except Exception as e:
        logger.error(f"Error fetching partners: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching partners: {str(e)}")
    
    finally:
        await conn.close()


@router.post("/login", response_model=LoginResponse)
async def login_partner(login_request: LoginRequest) -> LoginResponse:
    """Validate partner login credentials.
    
    In this iteration, password is hardcoded to '1234' for all partners.
    """
    # Validate password
    if login_request.password != PARTNERS_PASSWORD:
        logger.warning(f"Invalid password attempt for email: {login_request.email}")
        return LoginResponse(
            success=False,
            message="Contraseña incorrecta"
        )
    
    # Fetch partner information
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT 
                cu.email,
                cu.firstname,
                cu.lastname,
                c.name as company_name,
                c.business_partner_number as bpn
            FROM portal.company_users cu
            JOIN portal.identities i ON cu.id = i.id
            JOIN portal.companies c ON i.company_id = c.id
            WHERE LOWER(cu.email) = LOWER($1)
              AND c.business_partner_number IS NOT NULL
        """
        
        row = await conn.fetchrow(query, login_request.email)
        
        if not row:
            logger.warning(f"Partner not found for email: {login_request.email}")
            return LoginResponse(
                success=False,
                message="Usuario no encontrado"
            )
        
        partner_info = PartnerInfo(
            email=row['email'],
            firstname=row['firstname'] or '',
            lastname=row['lastname'] or '',
            company_name=row['company_name'],
            bpn=row['bpn']
        )
        
        logger.info(f"Successful login for partner: {partner_info.email} (BPN: {partner_info.bpn})")
        
        return LoginResponse(
            success=True,
            message="Login exitoso",
            partner=partner_info
        )
        
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")
    
    finally:
        await conn.close()


@router.get("/{email}/details", response_model=PartnerDetails)
async def get_partner_details(email: str) -> PartnerDetails:
    """Get detailed partner information including connector URLs."""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT 
                cu.email,
                cu.firstname,
                cu.lastname,
                c.name as company_name,
                c.business_partner_number as bpn,
                con.connector_url as dsp_url
            FROM portal.company_users cu
            JOIN portal.identities i ON cu.id = i.id
            JOIN portal.companies c ON i.company_id = c.id
            LEFT JOIN portal.connectors con ON con.provider_id = c.id
            WHERE LOWER(cu.email) = LOWER($1)
              AND c.business_partner_number IS NOT NULL
        """
        
        row = await conn.fetchrow(query, email)
        
        if not row:
            logger.warning(f"Partner not found for email: {email}")
            raise HTTPException(status_code=404, detail="Partner not found")
        
        dsp_url = row['dsp_url'] or ''
        management_url = convert_dsp_to_management_url(dsp_url)
        
        partner_details = PartnerDetails(
            email=row['email'],
            firstname=row['firstname'] or '',
            lastname=row['lastname'] or '',
            company_name=row['company_name'],
            bpn=row['bpn'],
            management_url=management_url,
            dsp_url=dsp_url
        )
        
        logger.info(f"Retrieved details for partner: {partner_details.email}")
        return partner_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching partner details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching partner details: {str(e)}")
    
    finally:
        await conn.close()
