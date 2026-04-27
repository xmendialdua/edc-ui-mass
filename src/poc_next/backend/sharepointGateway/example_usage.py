"""
Example usage of SharePointGateway

This script demonstrates how to use the SharePointGateway class to:
- Authenticate with Azure AD
- List files and folders from SharePoint
- Navigate folder structures
- Download files

Prerequisites:
1. Install dependencies: pip install -r requirements.txt
2. Configure Azure AD app registration with appropriate permissions
3. Set environment variables or update the configuration section below
"""

import os
from SharePointGateway import SharePointGateway, SharePointFile
from typing import List


def format_size(bytes: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes < 1024.0:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.2f} TB"


def print_files(files: List[SharePointFile], indent: int = 0):
    """Print files and folders in a tree-like structure"""
    prefix = "  " * indent
    for file in files:
        icon = "📁" if file.is_folder else "📄"
        size_info = ""
        if file.size is not None and not file.is_folder:
            size_info = f" ({format_size(file.size)})"
        
        folder_info = ""
        if file.folder:
            folder_info = f" [{file.folder.child_count} items]"
        
        print(f"{prefix}{icon} {file.name}{size_info}{folder_info}")


def example_list_root_files():
    """
    Example 1: List files in the root of SharePoint drive
    """
    print("\n=== Example 1: List Root Files ===")
    
    # Get access token (in production, obtain this from Azure AD authentication)
    access_token = os.getenv('SHAREPOINT_ACCESS_TOKEN')
    if not access_token:
        print("⚠️  SHAREPOINT_ACCESS_TOKEN environment variable not set")
        return
    
    # Initialize gateway
    gateway = SharePointGateway(access_token=access_token)
    
    try:
        # Get files from root
        files = gateway.get_sharepoint_files()
        print(f"\nFound {len(files)} items in root:")
        print_files(files)
        
    except Exception as e:
        print(f"Error: {e}")


def example_navigate_folder():
    """
    Example 2: Navigate to a specific folder
    """
    print("\n=== Example 2: Navigate to Folder ===")
    
    access_token = os.getenv('SHAREPOINT_ACCESS_TOKEN')
    if not access_token:
        print("⚠️  SHAREPOINT_ACCESS_TOKEN environment variable not set")
        return
    
    gateway = SharePointGateway(access_token=access_token)
    
    try:
        # First, get root files to find a folder
        files = gateway.get_sharepoint_files()
        folders = [f for f in files if f.is_folder]
        
        if not folders:
            print("No folders found in root")
            return
        
        # Navigate to first folder
        first_folder = folders[0]
        print(f"\nNavigating to folder: {first_folder.name}")
        
        folder_contents = gateway.get_sharepoint_files(item_id=first_folder.id)
        print(f"Found {len(folder_contents)} items:")
        print_files(folder_contents, indent=1)
        
    except Exception as e:
        print(f"Error: {e}")


def example_download_file():
    """
    Example 3: Download a file
    """
    print("\n=== Example 3: Download File ===")
    
    access_token = os.getenv('SHAREPOINT_ACCESS_TOKEN')
    drive_id = os.getenv('SHAREPOINT_DRIVE_ID')
    
    if not access_token:
        print("⚠️  SHAREPOINT_ACCESS_TOKEN environment variable not set")
        return
    
    if not drive_id:
        print("⚠️  SHAREPOINT_DRIVE_ID environment variable not set")
        return
    
    gateway = SharePointGateway(access_token=access_token, default_drive_id=drive_id)
    
    try:
        # Get files from root
        files = gateway.get_sharepoint_files()
        
        # Find first non-folder file
        file_to_download = next((f for f in files if not f.is_folder), None)
        
        if not file_to_download:
            print("No files found to download")
            return
        
        print(f"\nDownloading file: {file_to_download.name}")
        
        # Download to current directory
        output_path = f"./downloaded_{file_to_download.name}"
        gateway.download_file_to_path(
            drive_id=drive_id,
            item_id=file_to_download.id,
            output_path=output_path
        )
        
        print(f"✓ File downloaded to: {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")


def example_access_by_site_url():
    """
    Example 4: Access SharePoint by site URL
    """
    print("\n=== Example 4: Access by Site URL ===")
    
    access_token = os.getenv('SHAREPOINT_ACCESS_TOKEN')
    site_url = os.getenv('SHAREPOINT_SITE_URL')  # e.g., "yourcompany.sharepoint.com:/sites/yoursite"
    
    if not access_token:
        print("⚠️  SHAREPOINT_ACCESS_TOKEN environment variable not set")
        return
    
    if not site_url:
        print("⚠️  SHAREPOINT_SITE_URL environment variable not set")
        print("Example format: yourcompany.sharepoint.com:/sites/yoursite")
        return
    
    gateway = SharePointGateway(access_token=access_token)
    
    try:
        print(f"\nAccessing site: {site_url}")
        files = gateway.get_sharepoint_files_by_site_url(site_url=site_url)
        print(f"Found {len(files)} items:")
        print_files(files)
        
    except Exception as e:
        print(f"Error: {e}")


def example_get_metadata():
    """
    Example 5: Get file metadata
    """
    print("\n=== Example 5: Get File Metadata ===")
    
    access_token = os.getenv('SHAREPOINT_ACCESS_TOKEN')
    drive_id = os.getenv('SHAREPOINT_DRIVE_ID')
    
    if not access_token or not drive_id:
        print("⚠️  Environment variables not set")
        return
    
    gateway = SharePointGateway(access_token=access_token, default_drive_id=drive_id)
    
    try:
        # Get files from root
        files = gateway.get_sharepoint_files()
        
        if not files:
            print("No files found")
            return
        
        # Get metadata for first file
        first_item = files[0]
        print(f"\nGetting metadata for: {first_item.name}")
        
        metadata = gateway.get_file_metadata(
            drive_id=drive_id,
            item_id=first_item.id
        )
        
        print(f"\nMetadata:")
        print(f"  Name: {metadata.name}")
        print(f"  ID: {metadata.id}")
        print(f"  Type: {'Folder' if metadata.is_folder else 'File'}")
        print(f"  URL: {metadata.web_url}")
        if metadata.size:
            print(f"  Size: {format_size(metadata.size)}")
        if metadata.last_modified:
            print(f"  Last Modified: {metadata.last_modified}")
        
    except Exception as e:
        print(f"Error: {e}")


def main():
    """
    Main function - Run all examples
    """
    print("=" * 60)
    print("SharePoint Gateway - Python Examples")
    print("=" * 60)
    
    print("\n📋 Required Environment Variables:")
    print("  - SHAREPOINT_ACCESS_TOKEN: OAuth access token")
    print("  - SHAREPOINT_DRIVE_ID: SharePoint drive ID (optional)")
    print("  - SHAREPOINT_SITE_URL: SharePoint site URL (optional)")
    
    print("\n💡 Tip: Create a .env file with these variables")
    print("   and load it with python-dotenv")
    
    # Try to load .env file if it exists
    try:
        from dotenv import load_dotenv
        if load_dotenv():
            print("\n✓ Loaded .env file")
    except ImportError:
        print("\n⚠️  python-dotenv not installed (optional)")
    
    # Check if we have the minimum required configuration
    if not os.getenv('SHAREPOINT_ACCESS_TOKEN'):
        print("\n❌ Cannot run examples without SHAREPOINT_ACCESS_TOKEN")
        print("\nTo get an access token:")
        print("1. Use Azure AD authentication flow")
        print("2. Request appropriate Microsoft Graph API scopes:")
        print("   - Files.Read.All or Sites.Read.All")
        print("3. Set the token in your environment")
        return
    
    # Run examples
    try:
        example_list_root_files()
        example_navigate_folder()
        example_get_metadata()
        example_download_file()
        example_access_by_site_url()
    except KeyboardInterrupt:
        print("\n\n⏸️  Interrupted by user")
    
    print("\n" + "=" * 60)
    print("Examples completed")
    print("=" * 60)


if __name__ == "__main__":
    main()
