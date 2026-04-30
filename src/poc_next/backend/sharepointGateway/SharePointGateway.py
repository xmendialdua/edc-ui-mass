"""
SharePoint Gateway using Microsoft Graph API

This service provides methods to interact with SharePoint files and folders
using the Microsoft Graph API. It uses OAuth access tokens obtained through
Azure AD app registration to access corporate SharePoint resources.

Requirements:
    pip install requests python-dotenv

Environment Variables:
    SHAREPOINT_DRIVE_ID: Default SharePoint drive ID (optional)
"""

import os
import base64
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
import requests
from enum import Enum
import io
import zipfile


@dataclass
class FolderInfo:
    """Information about a folder"""
    child_count: int


@dataclass
class SharePointFile:
    """
    Represents a SharePoint file or folder
    
    Attributes:
        id: Unique identifier for the item
        name: Display name of the file or folder
        web_url: URL to access the item in SharePoint
        size: Size in bytes (optional)
        last_modified: Last modification timestamp (optional)
        is_folder: True if item is a folder, False if it's a file
        folder: Folder metadata (optional, only for folders)
    """
    id: str
    name: str
    web_url: str
    size: Optional[int] = None
    last_modified: Optional[str] = None
    is_folder: bool = False
    folder: Optional[FolderInfo] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            'id': self.id,
            'name': self.name,
            'webUrl': self.web_url,
            'isFolder': self.is_folder,
        }
        if self.size is not None:
            result['size'] = self.size
        if self.last_modified:
            result['lastModified'] = self.last_modified
        if self.folder:
            result['folder'] = {'childCount': self.folder.child_count}
        return result


class SharePointGateway:
    """
    Gateway class to interact with SharePoint via Microsoft Graph API
    
    This class provides methods to:
    - List files and folders from a SharePoint drive
    - Navigate folder hierarchies
    - Download files
    - Access SharePoint sites by URL
    
    Example usage:
        gateway = SharePointGateway(access_token="your_token_here")
        files = gateway.get_sharepoint_files()
        for file in files:
            print(f"{file.name} - {'Folder' if file.is_folder else 'File'}")
    """
    
    GRAPH_API_BASE_URL = "https://graph.microsoft.com/v1.0"
    
    def __init__(self, access_token: str, default_drive_id: Optional[str] = None):
        """
        Initialize the SharePoint Gateway
        
        Args:
            access_token: OAuth 2.0 access token for Microsoft Graph API
            default_drive_id: Default SharePoint drive ID (optional, can use env var)
        """
        self.access_token = access_token
        self.default_drive_id = default_drive_id or os.getenv('SHAREPOINT_DRIVE_ID')
        self.session = self._create_session()
    
    def _create_session(self) -> requests.Session:
        """
        Create an authenticated requests session
        
        Returns:
            Configured requests.Session with authentication headers
        """
        session = requests.Session()
        session.headers.update({
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        return session
    
    def _parse_drive_item(self, item: Dict[str, Any]) -> SharePointFile:
        """
        Parse a DriveItem from Microsoft Graph API response
        
        Args:
            item: Raw drive item data from Graph API
            
        Returns:
            SharePointFile object with parsed data
        """
        folder_info = None
        if 'folder' in item:
            folder_info = FolderInfo(
                child_count=item['folder'].get('childCount', 0)
            )
        
        return SharePointFile(
            id=item.get('id', ''),
            name=item.get('name', ''),
            web_url=item.get('webUrl', ''),
            size=item.get('size'),
            last_modified=item.get('lastModifiedDateTime'),
            is_folder='folder' in item,
            folder=folder_info
        )
    
    def get_sharepoint_files(
        self,
        drive_id: Optional[str] = None,
        item_id: Optional[str] = None
    ) -> List[SharePointFile]:
        """
        Get files and folders from a SharePoint drive
        
        Args:
            drive_id: SharePoint drive ID (optional, uses user's default drive if not provided)
            item_id: Folder item ID for navigation (optional, uses root if not provided)
            
        Returns:
            List of SharePointFile objects representing files and folders
            
        Raises:
            requests.HTTPError: If the API request fails
        """
        try:
            # Build endpoint URL
            if drive_id:
                # Use specific drive
                if item_id:
                    endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}/children"
                else:
                    endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/root/children"
            else:
                # Use user's default drive (OneDrive or primary SharePoint)
                if item_id:
                    endpoint = f"{self.GRAPH_API_BASE_URL}/me/drive/items/{item_id}/children"
                else:
                    endpoint = f"{self.GRAPH_API_BASE_URL}/me/drive/root/children"
            
            # Make API request
            response = self.session.get(endpoint)
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            items = data.get('value', [])
            
            # Convert to SharePointFile objects
            return [self._parse_drive_item(item) for item in items]
            
        except requests.HTTPError as error:
            print(f"Error fetching SharePoint files: {error}")
            
            # Try to get detailed error message from response
            try:
                error_detail = error.response.json()
                print(f"Response error detail: {error_detail}")
                if 'error' in error_detail:
                    error_msg = error_detail['error'].get('message', 'Unknown error')
                    error_code = error_detail['error'].get('code', 'Unknown code')
                    print(f"Microsoft Graph Error [{error_code}]: {error_msg}")
            except:
                print(f"Response: {error.response.text if error.response else 'No response'}")
            
            raise
    
    def get_sharepoint_files_by_site_url(
        self,
        site_url: str,
        item_id: Optional[str] = None
    ) -> List[SharePointFile]:
        """
        Get files from a SharePoint site by site URL
        
        Args:
            site_url: SharePoint site URL (e.g., 'https://yourcompany.sharepoint.com/sites/yoursite')
            item_id: Folder item ID for navigation (optional, uses root if not provided)
            
        Returns:
            List of SharePointFile objects representing files and folders
            
        Raises:
            requests.HTTPError: If the API request fails
        """
        try:
            # Step 1: Parse the site URL and construct Graph API format
            # Input: https://ikerlan.sharepoint.com/sites/IKDataSpace
            # Output: ikerlan.sharepoint.com:/sites/IKDataSpace:
            
            # Remove protocol if present
            parsed_url = site_url.replace('https://', '').replace('http://', '')
            
            # Split hostname and path
            if '/sites/' in parsed_url:
                parts = parsed_url.split('/sites/', 1)
                hostname = parts[0]
                site_path = parts[1]
                # Construct Graph API format: hostname:/sites/path:
                graph_site_format = f"{hostname}:/sites/{site_path}:"
            else:
                # If no /sites/ path, use the URL as-is (might be just hostname)
                graph_site_format = parsed_url
            
            # Step 2: Get the site ID using correct format
            site_endpoint = f"{self.GRAPH_API_BASE_URL}/sites/{graph_site_format}"
            site_response = self.session.get(site_endpoint)
            site_response.raise_for_status()
            site_data = site_response.json()
            site_id = site_data['id']
            
            # Step 2: Get the default drive (Documents library)
            drive_endpoint = f"{self.GRAPH_API_BASE_URL}/sites/{site_id}/drive"
            drive_response = self.session.get(drive_endpoint)
            drive_response.raise_for_status()
            drive_data = drive_response.json()
            drive_id = drive_data['id']
            
            # Step 3: Get files using the same logic as get_sharepoint_files
            if item_id:
                # Get children of a specific folder
                files_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}/children"
            else:
                # Get root items
                files_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/root/children"
            
            files_response = self.session.get(files_endpoint)
            files_response.raise_for_status()
            files_data = files_response.json()
            
            items = files_data.get('value', [])
            # Include drive_id in the file id for later download
            files = [self._parse_drive_item(item) for item in items]
            for file in files:
                # Format: drive_id|item_id
                file.id = f"{drive_id}|{file.id}"
            return files
            
        except requests.HTTPError as error:
            print(f"Error fetching SharePoint files by site URL: {error}")
            print(f"Response: {error.response.text if error.response else 'No response'}")
            raise
    
    def download_file(
        self,
        drive_id: Optional[str],
        item_id: str
    ) -> Tuple[bytes, str]:
        """
        Download a file from SharePoint
        
        Args:
            drive_id: SharePoint drive ID (uses default_drive_id if None)
            item_id: File item ID
            
        Returns:
            Tuple of (file_content, filename)
            
        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If drive_id is None and no default_drive_id is set
        """
        # Use default drive ID if not provided
        effective_drive_id = drive_id or self.default_drive_id
        if not effective_drive_id:
            raise ValueError("drive_id must be provided or default_drive_id must be set")
        
        try:
            # First get file metadata to get the filename
            metadata_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{effective_drive_id}/items/{item_id}"
            metadata_response = self.session.get(metadata_endpoint)
            metadata_response.raise_for_status()
            metadata = metadata_response.json()
            filename = metadata.get('name', 'download')
            
            # Then download the content
            content_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{effective_drive_id}/items/{item_id}/content"
            response = self.session.get(content_endpoint)
            response.raise_for_status()
            
            return response.content, filename
            
        except requests.HTTPError as error:
            print(f"Error downloading file: {error}")
            print(f"Response: {error.response.text if error.response else 'No response'}")
            raise
    
    def get_download_url(
        self,
        drive_id: str,
        item_id: str
    ) -> str:
        """
        Get a pre-authenticated download URL for a SharePoint file.
        This URL is temporary (valid for ~1 hour) and can be accessed without authentication.
        
        Args:
            drive_id: SharePoint drive ID
            item_id: File item ID
            
        Returns:
            Pre-authenticated download URL that works without additional authentication
            
        Raises:
            requests.HTTPError: If the API request fails
        """
        try:
            endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}"
            
            # Add ?select to get the downloadUrl property
            response = self.session.get(f"{endpoint}?select=id,name,@microsoft.graph.downloadUrl")
            response.raise_for_status()
            
            data = response.json()
            download_url = data.get('@microsoft.graph.downloadUrl')
            
            if not download_url:
                raise ValueError("No download URL available for this item")
            
            return download_url
            
        except requests.HTTPError as error:
            print(f"Error getting download URL: {error}")
            print(f"Response: {error.response.text if error.response else 'No response'}")
            raise
    
    def create_public_download_link(
        self,
        drive_id: str,
        item_id: str,
        expiration_days: int = 365
    ) -> str:
        """
        Create a public sharing link and return a direct download URL.
        
        This method performs two steps:
        1. Creates a public sharing link (anonymous access)
        2. Converts it to a direct download URL via Microsoft Graph
        
        The resulting URL:
        - Does NOT require authentication
        - Can be used directly by EDC DataPlane
        - Is valid for the specified expiration period
        - Downloads the file content directly (binary)
        
        Args:
            drive_id: SharePoint drive ID
            item_id: File item ID
            expiration_days: Number of days until link expires (default: 365)
            
        Returns:
            Public download URL that can be used without authentication
            Format: https://graph.microsoft.com/v1.0/shares/u!{token}/driveItem/content
            
        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If the response doesn't contain expected data
            
        Note:
            Requires Sites.ReadWrite.All permission in Azure AD
        """
        try:
            # STEP 1: Create public sharing link
            endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}/createLink"
            
            # Calculate expiration date
            expiration = datetime.now() + timedelta(days=expiration_days)
            
            payload = {
                "type": "view",  # Read-only access
                "scope": "anonymous",  # Public access, no login required
                "expirationDateTime": expiration.isoformat() + "Z"
            }
            
            print(f"Creating public sharing link (expires in {expiration_days} days)...")
            response = self.session.post(endpoint, json=payload)
            response.raise_for_status()
            
            data = response.json()
            sharing_url = data.get("link", {}).get("webUrl")
            
            if not sharing_url:
                raise ValueError("No sharing URL in response")
            
            print(f"✅ Sharing link created: {sharing_url[:50]}...")
            
            # STEP 2: Convert to direct download URL
            # Encode the sharing URL in base64 URL-safe format (without padding)
            encoded = base64.urlsafe_b64encode(sharing_url.encode()).decode().rstrip('=')
            
            # Construct Microsoft Graph download URL
            # This URL is publicly accessible and returns file content directly
            download_url = f"https://graph.microsoft.com/v1.0/shares/u!{encoded}/driveItem/content"
            
            print(f"✅ Direct download URL generated")
            print(f"   URL: {download_url[:80]}...")
            print(f"   Expiration: {expiration.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return download_url
            
        except requests.HTTPError as error:
            print(f"❌ Error creating sharing link: {error}")
            
            # Try to get detailed error message
            try:
                error_detail = error.response.json()
                print(f"Response error detail: {error_detail}")
                if 'error' in error_detail:
                    error_msg = error_detail['error'].get('message', 'Unknown error')
                    error_code = error_detail['error'].get('code', 'Unknown code')
                    print(f"Microsoft Graph Error [{error_code}]: {error_msg}")
                    
                    # Common error: Missing Sites.ReadWrite.All permission
                    if "AccessDenied" in error_code or "Forbidden" in str(error):
                        print("💡 Tip: Ensure Azure AD app has Sites.ReadWrite.All permission")
                        print("   and Admin Consent has been granted")
            except:
                print(f"Response: {error.response.text if error.response else 'No response'}")
            
            raise
    
    def download_file_to_path(
        self,
        drive_id: str,
        item_id: str,
        output_path: str
    ) -> None:
        """
        Download a file from SharePoint and save it to disk
        
        Args:
            drive_id: SharePoint drive ID
            item_id: File item ID
            output_path: Local file path where the file will be saved
            
        Raises:
            requests.HTTPError: If the API request fails
            IOError: If there's an error writing the file
        """
        content = self.download_file(drive_id, item_id)
        
        with open(output_path, 'wb') as f:
            f.write(content)
        
        print(f"File downloaded successfully to: {output_path}")
    
    def get_file_metadata(
        self,
        drive_id: Optional[str],
        item_id: str
    ) -> SharePointFile:
        """
        Get metadata for a specific file or folder
        
        Args:
            drive_id: SharePoint drive ID (uses default_drive_id if None)
            item_id: File or folder item ID
            
        Returns:
            SharePointFile object with metadata
            
        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If drive_id is None and no default_drive_id is set
        """
        # Use default drive ID if not provided
        effective_drive_id = drive_id or self.default_drive_id
        if not effective_drive_id:
            raise ValueError("drive_id must be provided or default_drive_id must be set")
        
        try:
            endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{effective_drive_id}/items/{item_id}"
            
            response = self.session.get(endpoint)
            response.raise_for_status()
            
            item_data = response.json()
            return self._parse_drive_item(item_data)
            
        except requests.HTTPError as error:
            print(f"Error fetching file metadata: {error}")
            print(f"Response: {error.response.text if error.response else 'No response'}")
            raise
    
    def download_folder_as_zip(
        self,
        drive_id: Optional[str],
        folder_id: str
    ) -> Tuple[bytes, str]:
        """
        Download all contents of a folder recursively and package them as a ZIP file
        
        Args:
            drive_id: SharePoint drive ID (uses default_drive_id if None)
            folder_id: Folder item ID
            
        Returns:
            Tuple of (zip_content, zip_filename)
            
        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If drive_id is None and no default_drive_id is set
        """
        # Use default drive ID if not provided
        effective_drive_id = drive_id or self.default_drive_id
        if not effective_drive_id:
            raise ValueError("drive_id must be provided or default_drive_id must be set")
        
        # Get folder metadata to get its name
        folder_metadata = self.get_file_metadata(effective_drive_id, folder_id)
        if not folder_metadata.is_folder:
            raise ValueError(f"Item {folder_id} is not a folder")
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Recursively add all files to ZIP
            self._add_folder_to_zip(zip_file, effective_drive_id, folder_id, "")
        
        # Get ZIP content
        zip_buffer.seek(0)
        zip_content = zip_buffer.read()
        zip_filename = f"{folder_metadata.name}.zip"
        
        return zip_content, zip_filename
    
    def _add_folder_to_zip(
        self,
        zip_file: zipfile.ZipFile,
        drive_id: str,
        folder_id: str,
        path_in_zip: str
    ) -> None:
        """
        Recursively add folder contents to ZIP file
        
        Args:
            zip_file: ZipFile object to add files to
            drive_id: SharePoint drive ID
            folder_id: Folder item ID
            path_in_zip: Current path within the ZIP file
        """
        # Get all items in the folder
        items = self.get_sharepoint_files(drive_id=drive_id, item_id=folder_id)
        
        for item in items:
            # Build the path for this item in the ZIP
            item_path = os.path.join(path_in_zip, item.name) if path_in_zip else item.name
            
            if item.is_folder:
                # Recursively add subfolder contents
                self._add_folder_to_zip(zip_file, drive_id, item.id, item_path)
            else:
                # Download and add file to ZIP
                try:
                    file_content, _ = self.download_file(drive_id, item.id)
                    zip_file.writestr(item_path, file_content)
                    print(f"Added to ZIP: {item_path}")
                except Exception as e:
                    print(f"Warning: Could not add file {item.name} to ZIP: {e}")


# Example usage
if __name__ == "__main__":
    """
    Example usage of SharePointGateway
    
    Before running:
    1. Set environment variables or provide values directly
    2. Obtain an access token from Azure AD
    """
    
    # Example: Initialize gateway with access token
    # access_token = "your_access_token_here"
    # gateway = SharePointGateway(access_token=access_token)
    
    # Example: List files in root
    # files = gateway.get_sharepoint_files()
    # for file in files:
    #     print(f"{'📁' if file.is_folder else '📄'} {file.name}")
    
    # Example: Navigate to a folder
    # folder_id = "some_folder_id"
    # folder_contents = gateway.get_sharepoint_files(item_id=folder_id)
    
    # Example: Download a file
    # gateway.download_file_to_path(
    #     drive_id="your_drive_id",
    #     item_id="file_item_id",
    #     output_path="./downloaded_file.pdf"
    # )
    
    print("SharePointGateway module loaded successfully")
    print("Import this module and create an instance with your access token to use it")
