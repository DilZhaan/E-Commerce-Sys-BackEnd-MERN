/**
 * Simple test script to test the cart API endpoints
 * Run with: node tests/cart-api-test.js
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000/api/cart'; // Adjust the port if needed
let authToken = ''; // Will be set after login

// Login to get authentication token
async function login() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@example.com', // Replace with a valid user
        password: 'password123'    // Replace with the actual password
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      authToken = data.token;
      console.log('✅ Login successful - received auth token');
      return true;
    } else {
      console.error('❌ Login failed:', data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ Error during login:', error.message);
    return false;
  }
}

// Get current cart
async function getCart() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    console.log('Cart response:', data);
    
    if (data.success) {
      console.log('✅ Get cart successful');
      return data.data;
    } else {
      console.error('❌ Get cart failed:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting cart:', error.message);
    return null;
  }
}

// Add item to cart
async function addToCart(productId, quantity = 1) {
  try {
    console.log(`Attempting to add product ${productId} with quantity ${quantity} to cart...`);
    
    const response = await fetch(`${API_URL}/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        productId,
        quantity
      })
    });

    const data = await response.json();
    console.log('Add to cart response:', data);
    
    if (data.success) {
      console.log('✅ Item added to cart successfully');
      return data.data;
    } else {
      console.error('❌ Add to cart failed:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error adding to cart:', error.message);
    return null;
  }
}

// Update cart item quantity
async function updateCartItem(itemId, quantity) {
  try {
    const response = await fetch(`${API_URL}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        itemId,
        quantity
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Cart item updated successfully');
      return data.data;
    } else {
      console.error('❌ Update cart failed:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating cart item:', error.message);
    return null;
  }
}

// Remove item from cart
async function removeFromCart(itemId) {
  try {
    const response = await fetch(`${API_URL}/item/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Cart item removed successfully');
      return data.data;
    } else {
      console.error('❌ Remove from cart failed:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error removing item from cart:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting cart API tests...');
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Cannot continue tests without authentication');
    return;
  }
  
  // Step 2: Get initial cart
  console.log('\n📦 Getting initial cart...');
  const initialCart = await getCart();
  
  // Step 3: Add item to cart
  // Replace with a valid product ID from your database
  const productId = '60d21b4667d0d8992e610c85'; // Example ID - replace with real one
  console.log(`\n📦 Adding product ${productId} to cart...`);
  const updatedCart = await addToCart(productId, 2);
  
  if (updatedCart && updatedCart.items.length > 0) {
    // Step 4: Update item quantity
    const itemId = updatedCart.items[0]._id;
    console.log(`\n📦 Updating quantity of item ${itemId}...`);
    await updateCartItem(itemId, 3);
    
    // Step 5: Remove item from cart
    console.log(`\n📦 Removing item ${itemId} from cart...`);
    await removeFromCart(itemId);
  }
  
  // Step 6: Final cart check
  console.log('\n📦 Getting final cart state...');
  await getCart();
  
  console.log('\n🏁 Cart API tests completed.');
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
}); 