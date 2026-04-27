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
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import requests
from enum import Enum


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
        drive_id: str,
        item_id: str
    ) -> Tuple[bytes, str]:
        """
        Download a file from SharePoint
        
        Args:
            drive_id: SharePoint drive ID
            item_id: File item ID
            
        Returns:
            Tuple of (file_content, filename)
            
        Raises:
            requests.HTTPError: If the API request fails
        """
        try:
            # First get file metadata to get the filename
            metadata_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}"
            metadata_response = self.session.get(metadata_endpoint)
            metadata_response.raise_for_status()
            metadata = metadata_response.json()
            filename = metadata.get('name', 'download')
            
            # Then download the content
            content_endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}/content"
            response = self.session.get(content_endpoint)
            response.raise_for_status()
            
            return response.content, filename
            
        except requests.HTTPError as error:
            print(f"Error downloading file: {error}")
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
        drive_id: str,
        item_id: str
    ) -> SharePointFile:
        """
        Get metadata for a specific file or folder
        
        Args:
            drive_id: SharePoint drive ID
            item_id: File or folder item ID
            
        Returns:
            SharePointFile object with metadata
            
        Raises:
            requests.HTTPError: If the API request fails
        """
        try:
            endpoint = f"{self.GRAPH_API_BASE_URL}/drives/{drive_id}/items/{item_id}"
            
            response = self.session.get(endpoint)
            response.raise_for_status()
            
            item_data = response.json()
            return self._parse_drive_item(item_data)
            
        except requests.HTTPError as error:
            print(f"Error fetching file metadata: {error}")
            print(f"Response: {error.response.text if error.response else 'No response'}")
            raise


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
