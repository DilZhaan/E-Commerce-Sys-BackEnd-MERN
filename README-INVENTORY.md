# Inventory Management Module

This module provides a complete backend for managing inventory items including:

- Product model details
- Purchase prices and warranty information
- Supplier information
- Stock quantities and reorder levels
- Bill images

## Setup Instructions

### 1. Install Required Dependencies

Run one of the following commands to install the required dependencies:

**On Windows:**
```
install-dependencies.bat
```

**On macOS/Linux:**
```
chmod +x install-dependencies.sh
./install-dependencies.sh
```

Or manually install:
```
npm install express-fileupload
```

### 2. Verify Configuration

The `express-fileupload` middleware has been configured in `index.js` to handle bill image uploads with the following settings:
- Maximum file size: 10MB
- Auto-creates parent directories

### 3. API Endpoints

The module provides the following API endpoints:

#### Public Endpoints (Requires Authentication)
- `GET /api/inventory` - Get all inventory items (paginated)
- `GET /api/inventory/search?q=searchterm` - Search for inventory items
- `GET /api/inventory/:id` - Get a specific inventory item by ID

#### Admin-Only Endpoints
- `POST /api/inventory` - Add a new inventory item
- `PUT /api/inventory/:id` - Update an existing inventory item
- `DELETE /api/inventory/:id` - Delete an inventory item
- `GET /api/inventory/export/all` - Export all inventory items

### 4. Data Model

The inventory items have the following structure:

```javascript
{
  modelName: String,          // Required
  purchasedPrice: Number,     // Required
  warranty: Number,           // Required (in months)
  quantity: Number,           // Required (default: 0)
  reorderLevel: Number,       // Required (default: 5)
  brandName: String,          // Required
  supplierName: String,       // Required
  supplierContact: String,    // Required
  supplierAddress: String,    // Required
  billImage: String,          // Optional (path to image)
  createdAt: Date,            // Auto-populated
  updatedAt: Date             // Auto-updated
}
```

### 5. File Upload

When creating or updating inventory items with bill images:

1. Send as `multipart/form-data`
2. Include the image file with field name `billImage`
3. When updating an item, include `replaceBillImage=true` to replace the existing image

## Usage Example

### Adding a new inventory item with an image

```javascript
// Frontend code example
const formData = new FormData();
formData.append('modelName', 'Dell XPS 15');
formData.append('purchasedPrice', '1200');
formData.append('warranty', '24');
formData.append('quantity', '10');
formData.append('reorderLevel', '3');
formData.append('brandName', 'Dell');
formData.append('supplierName', 'TechSupplies Inc.');
formData.append('supplierContact', '+1-234-567-8900');
formData.append('supplierAddress', '123 Tech Avenue, Boston, MA');
formData.append('billImage', fileObject); // From file input

const response = await axios.post(
  'http://localhost:4000/api/inventory',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    withCredentials: true
  }
);
```

## Troubleshooting

If you encounter any issues:

1. Make sure the `uploads` directory is writable
2. Verify that you have installed the `express-fileupload` dependency
3. Check the server logs for error messages
4. Ensure you're sending form data properly for file uploads

For additional support, please contact the development team. 