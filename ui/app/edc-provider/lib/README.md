# Provider Library

This folder contains utility functions and API clients for the EDC Provider interface.

## Files

### api.ts

This file contains functions for interacting with the EDC Provider API:

#### Asset Management
- `getAssets()`: Fetch all assets
- `createAsset(asset)`: Create a new asset
- `deleteAsset(id)`: Delete an asset by ID

#### Policy Management
- `getPolicies()`: Fetch all policies
- `createPolicy(policy)`: Create a new policy
- `deletePolicy(id)`: Delete a policy by ID

#### Contract Definition Management
- `getContractDefinitions()`: Fetch all contract definitions
- `createContractDefinition(contractDefinition)`: Create a new contract definition
- `deleteContractDefinition(id)`: Delete a contract definition by ID

#### Connector Management
- `getConnectorAddress()`: Get the current connector address
- `setConnectorAddress(address)`: Set a new connector address
- `checkConnectorReachable(address)`: Check if a connector is reachable

#### Mock Data
- `getMockAssets()`: Get mock asset data
- `getMockPolicies()`: Get mock policy data
- `getMockContractDefinitions()`: Get mock contract definition data

#### Debugging
- `debugApiCall(action, params, error)`: Log API call details for debugging
