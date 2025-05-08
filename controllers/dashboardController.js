import Order from '../models/Order.js';
import User from '../models/User.Model.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import ShopProductModel from '../models/ShopProduct.js';

// Get admin dashboard statistics
export const getAdminStats = async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await ShopProductModel.countDocuments();
    
    // Get orders statistics
    const allOrders = await Order.find();
    const totalOrders = allOrders.length;
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    
    // Calculate total revenue
    const revenue = allOrders.reduce((total, order) => {
      return total + (order.totalAmount || 0);
    }, 0);
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get recent activity (last 5 orders)
    const recentOrders = await Order.find()
      .populate('user', 'fName lName email')
      .sort({ createdAt: -1 })
      .limit(5);
      
    const recentUsers = await User.find()
      .select('fName lName email createdAt')
      .sort({ createdAt: -1 })
      .limit(3);
      
    // Format recent activity for frontend
    const recentActivity = [
      ...recentOrders.map(order => ({
        type: 'order',
        id: order._id,
        date: order.createdAt,
        details: {
          orderNumber: order._id,
          customerName: order.user ? `${order.user.fName} ${order.user.lName}` : 'Unknown',
          amount: order.totalAmount,
          status: order.status
        }
      })),
      ...recentUsers.map(user => ({
        type: 'user',
        id: user._id,
        date: user.createdAt,
        details: {
          name: `${user.fName} ${user.lName}`,
          email: user.email
        }
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        pendingOrders,
        totalUsers,
        revenue,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get user dashboard statistics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's orders
    const orders = await Order.find({ user: userId });
    const totalOrders = orders.length;
    
    // Get total spent
    const totalSpent = orders.reduce((total, order) => {
      return total + (order.totalAmount || 0);
    }, 0);
    
    // Get cart information
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    const cartItemCount = cart ? cart.items.length : 0;
    
    // Get issue count
    const Issue = mongoose.model('Issue');
    const issueCount = await Issue.countDocuments({ user: userId });
    
    // Get recent orders (last 5)
    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        recentOrders,
        cartItemCount,
        totalSpent,
        issueCount
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
}; 