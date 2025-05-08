import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import ShopProductModel from '../models/ShopProduct.js';
import InventoryModel from '../models/inventoryModel.js';

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, items } = req.body;
    
    let orderItems = [];
    let totalAmount = 0;
    
    // If items are provided directly in the request (not using cart)
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate all items and check stock
      for (const item of items) {
        if (!item.product) {
          return res.status(400).json({
            success: false,
            message: 'Invalid product in order. Product ID is required.'
          });
        }
        
        const product = await ShopProductModel.findById(item.product).populate('inventoryItem');
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product ${item.product} not found`
          });
        }
        
        // Check if product is active
        if (!product.active) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} is no longer available`
          });
        }
        
        // Check if inventory exists
        if (!product.inventoryItem) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} has no inventory information`
          });
        }
        
        // Check stock
        const inventoryQuantity = product.inventoryItem.quantity || 0;
        if (inventoryQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${product.name}. Available: ${inventoryQuantity}, Requested: ${item.quantity}`
          });
        }
        
        // Update the actual inventory document
        const inventory = await InventoryModel.findById(product.inventoryItem._id);
        if (inventory) {
          inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
          await inventory.save();
          console.log(`Updated inventory for ${product.name}, new quantity: ${inventory.quantity}`);
        } else {
          console.error(`Inventory not found for product ${product.name}`);
        }
        
        // Add to order items
        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: item.price || product.price
        });
        
        // Add to total
        totalAmount += (item.price || product.price) * item.quantity;
      }
      
      // Create and save the order
      const order = new Order({
        user: userId,
        items: orderItems,
        totalAmount,
        shippingAddress
      });
      
      await order.save();
      
      // Also clear the user's cart to prevent duplicate orders
      const userCart = await Cart.findOne({ user: userId });
      if (userCart) {
        console.log('Clearing cart for user when items provided directly:', userId);
        console.log('Cart before clearing:', userCart.items.length, 'items');
        userCart.items = [];
        await userCart.save();
        console.log('Cart after clearing, items count:', userCart.items.length);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    }
    
    // Process order from cart (existing code)
    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty, cannot create order'
      });
    }
    
    // Check if all items are in stock
    for (const item of cart.items) {
      // Check if the item or item.product is null or undefined
      if (!item || !item.product || !item.product._id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product in cart. Please remove it and try again.'
        });
      }
      
      const product = await ShopProductModel.findById(item.product._id).populate('inventoryItem');
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product._id} not found`
        });
      }
      
      // Check if product is active
      if (!product.active) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is no longer available`
        });
      }
      
      // Check if inventory exists
      if (!product.inventoryItem) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} has no inventory information`
        });
      }
      
      // Get inventory information
      const inventoryQuantity = product.inventoryItem.quantity || 0;
      
      if (inventoryQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${inventoryQuantity}, Requested: ${item.quantity}`
        });
      }
    }
    
    // Calculate total amount
    totalAmount = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Create order items
    orderItems = await Promise.all(cart.items.map(async (item) => {
      const product = await ShopProductModel.findById(item.product._id).populate('inventoryItem');
      
      if (!product) {
        console.log(`Product not found when creating order: ${item.product._id}`);
        return {
          product: item.product._id,
          name: 'Unknown Product',
          quantity: item.quantity,
          price: item.price
        };
      }
      
      // Update inventory quantity correctly by finding the actual inventory document
      if (product.inventoryItem && product.inventoryItem._id) {
        try {
          // Find and update the inventory document directly
          const inventory = await InventoryModel.findById(product.inventoryItem._id);
          if (inventory) {
            // Make sure we don't decrease below zero
            inventory.quantity = Math.max(0, inventory.quantity - item.quantity);
            await inventory.save();
            console.log(`Updated inventory for ${product.name}, new quantity: ${inventory.quantity}`);
          } else {
            console.error(`Inventory not found for product ${product.name}`);
          }
        } catch (error) {
          console.error(`Error updating inventory for product ${product._id}:`, error);
        }
      }
      
      return {
        product: item.product._id,
        name: product.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price || 0
      };
    }));
    
    // Create new order
    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress
    });
    
    await order.save();
    
    // Clear cart
    console.log('Clearing cart for user:', userId);
    console.log('Cart before clearing:', cart.items.length, 'items');
    cart.items = [];
    await cart.save();
    console.log('Cart after clearing, items count:', cart.items.length);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fName lName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user orders',
      error: error.message
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const order = await Order.findById(id)
      .populate('user', 'fName lName email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is owner or admin
    if (order.user._id.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get the order
    const order = await Order.findById(id).populate({
      path: 'items.product',
      populate: {
        path: 'inventoryItem'
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get previous status before updating
    const previousStatus = order.status;
    
    // Don't allow updating if already delivered
    if (previousStatus === 'delivered' && status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a delivered order'
      });
    }
    
    // Handle inventory restoration for cancellation
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      // Only restore inventory if order wasn't already cancelled
      console.log(`Order ${id} status changing from ${previousStatus} to cancelled, restoring inventory quantities`);
      
      // Restore inventory quantities
      for (const item of order.items) {
        try {
          // Find the product and its inventory
          const product = item.product;
          
          if (product && product.inventoryItem && product.inventoryItem._id) {
            // Find and update the inventory document to restore the quantity
            const inventory = await InventoryModel.findById(product.inventoryItem._id);
            if (inventory) {
              inventory.quantity += item.quantity;
              await inventory.save();
              console.log(`Restored inventory for ${product.name || item.name}, new quantity: ${inventory.quantity}`);
            } else {
              console.error(`Inventory not found for product in canceled order: ${item.name}`);
            }
          } else {
            console.log(`No inventory found for item in canceled order: ${item.name}`);
          }
        } catch (error) {
          console.error(`Error restoring inventory for item ${item.name}:`, error);
        }
      }
    }
    
    // Update order status
    order.status = status;
    await order.save();
    
    // For cancelled orders, also update payment status if needed
    if (status === 'cancelled' && order.paymentStatus === 'completed') {
      // If payment was completed, mark as refunded
      order.paymentStatus = 'refunded';
      await order.save();
    }
    
    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Delete/cancel order
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate({
      path: 'items.product',
      populate: {
        path: 'inventoryItem'
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Only allow cancellation of orders that are pending or processing
    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status ${order.status}. Only pending or processing orders can be cancelled.`
      });
    }
    
    // Check if order belongs to the user making the request, unless admin
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order'
      });
    }
    
    // Update order status
    order.status = 'cancelled';
    
    // Restore inventory quantities
    for (const item of order.items) {
      try {
        // Find the product and its inventory
        const product = item.product;
        
        if (product && product.inventoryItem && product.inventoryItem._id) {
          // Find and update the inventory document to restore the quantity
          const inventory = await InventoryModel.findById(product.inventoryItem._id);
          if (inventory) {
            inventory.quantity += item.quantity;
            await inventory.save();
            console.log(`Restored inventory for ${product.name || item.name}, new quantity: ${inventory.quantity}`);
          } else {
            console.error(`Inventory not found for product in canceled order: ${item.name}`);
          }
        } else {
          console.log(`No inventory found for item in canceled order: ${item.name}`);
        }
      } catch (error) {
        console.error(`Error restoring inventory for item ${item.name}:`, error);
      }
    }
    
    // Save the updated order
    await order.save();
    
    // Log the cancellation
    console.log(`Order ${orderId} has been cancelled`);
    
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Update order payment status
export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order payment status
    order.paymentStatus = paymentStatus;
    
    // If payment is completed, update order status to processing if it's still pending
    if (paymentStatus === 'completed' && order.status === 'pending') {
      order.status = 'processing';
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order payment status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order payment status',
      error: error.message
    });
  }
};

// Clear all cancelled orders for a user
export const clearCancelledOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all cancelled orders for this user
    const cancelledOrders = await Order.find({ 
      user: userId,
      status: 'cancelled'
    });
    
    if (cancelledOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No cancelled orders to clear',
        count: 0
      });
    }
    
    // Delete all cancelled orders
    const result = await Order.deleteMany({
      user: userId,
      status: 'cancelled'
    });
    
    res.status(200).json({
      success: true,
      message: 'Cancelled orders cleared successfully',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cancelled orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cancelled orders',
      error: error.message
    });
  }
};

// Clear all cancelled orders (admin only)
export const clearAllCancelledOrders = async (req, res) => {
  try {
    // Find all cancelled orders
    const cancelledOrders = await Order.find({ 
      status: 'cancelled'
    });
    
    if (cancelledOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No cancelled orders to clear',
        count: 0
      });
    }
    
    // Delete all cancelled orders
    const result = await Order.deleteMany({
      status: 'cancelled'
    });
    
    res.status(200).json({
      success: true,
      message: 'All cancelled orders cleared successfully',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing all cancelled orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing all cancelled orders',
      error: error.message
    });
  }
}; 