import Cart from '../models/Cart.js';
import ShopProductModel from '../models/ShopProduct.js';

// Get cart for the current user
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      model: 'ShopProduct',
      select: 'name images price discount salePrice'
    });
    
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    console.log('Add to cart request received:', { 
      body: req.body,
      user: req.user
    });
    
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;
    
    if (!productId) {
      console.log('Product ID missing from request');
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Validate product exists
    const product = await ShopProductModel.findById(productId).populate('inventoryItem');
    if (!product) {
      console.log(`Product not found with ID: ${productId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is active
    if (!product.active) {
      console.log(`Product is not active: ${productId}`);
      return res.status(400).json({
        success: false,
        message: 'This product is currently not available'
      });
    }

    // Get inventory information - check if inventory item exists and has quantity
    if (!product.inventoryItem) {
      console.log(`Product has no inventory item: ${productId}`);
      return res.status(400).json({
        success: false,
        message: 'Product inventory information not available'
      });
    }
    
    const inventoryQuantity = product.inventoryItem.quantity || 0;

    // Check if product is in stock
    if (inventoryQuantity < quantity) {
      console.log(`Insufficient stock for product ${productId}: requested ${quantity}, available ${inventoryQuantity}`);
      return res.status(400).json({
        success: false,
        message: `Not enough product in stock. Available: ${inventoryQuantity}, Requested: ${quantity}`
      });
    }
    
    // Get cart or create if doesn't exist
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      console.log(`Creating new cart for user ${userId}`);
      cart = new Cart({ user: userId, items: [] });
    }
    
    // Calculate price with discount - use salePrice if available
    const basePrice = product.salePrice || product.price || 0;
    const productDiscount = product.discount || 0;
    const finalPrice = productDiscount > 0 
      ? basePrice * (1 - (productDiscount / 100))
      : basePrice;
    
    console.log('Product price calculation:', {
      productId: product._id,
      basePrice,
      productDiscount,
      finalPrice
    });
    
    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId.toString()
    );
    
    if (existingItemIndex > -1) {
      // Update quantity if product is already in cart
      console.log(`Product ${productId} already in cart, updating quantity from ${cart.items[existingItemIndex].quantity} to ${cart.items[existingItemIndex].quantity + quantity}`);
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      console.log(`Adding new product ${productId} to cart with quantity ${quantity}`);
      cart.items.push({
        product: productId,
        quantity,
        price: finalPrice
      });
    }
    
    await cart.save();
    console.log('Cart saved successfully');
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      model: 'ShopProduct',
      select: 'name images price discount salePrice active inventoryItem'
    });
    
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    console.log('Update cart item request received:', req.body);
    const { itemId, quantity } = req.body;
    const userId = req.user.id;
    
    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required'
      });
    }
    
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the cart item by ID
    const cartItemIndex = cart.items.findIndex(item => item._id.toString() === itemId.toString());
    
    if (cartItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    const cartItem = cart.items[cartItemIndex];
    
    // Check if product is in stock
    const product = await ShopProductModel.findById(cartItem.product).populate('inventoryItem');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product is active
    if (!product.active) {
      return res.status(400).json({
        success: false,
        message: 'This product is currently not available'
      });
    }
    
    // Get inventory information - check if inventory item exists
    if (!product.inventoryItem) {
      return res.status(400).json({
        success: false,
        message: 'Product inventory information not available'
      });
    }
    
    const inventoryQuantity = product.inventoryItem.quantity || 0;
    
    if (inventoryQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough product in stock. Available: ${inventoryQuantity}, Requested: ${quantity}`
      });
    }
    
    // Update quantity
    cart.items[cartItemIndex].quantity = quantity;
    await cart.save();
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      model: 'ShopProduct',
      select: 'name images price discount salePrice active inventoryItem'
    });
    
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart item',
      error: error.message
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the item index
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Remove the item
    cart.items.splice(itemIndex, 1);
    await cart.save();
    
    // Populate product details before returning response
    await cart.populate({
      path: 'items.product',
      model: 'ShopProduct',
      select: 'name images price discount salePrice'
    });
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    cart.items = [];
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
}; 