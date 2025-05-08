import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import crypto from 'crypto';

// Helper function to process card payment
const processCardPayment = async (cardDetails) => {
  // In a real implementation, this would connect to a payment gateway like Stripe, PayPal, etc.
  // For demonstration purposes, we'll simulate a payment processing service
  
  try {
    console.log("Processing card payment with details:", cardDetails);
    
    // Basic validation to ensure the request has some data
    if (!cardDetails) {
      return {
        success: false,
        message: 'No card details provided'
      };
    }
    
    // Generate a transaction ID
    const transactionId = `CARD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // For testing, always approve payments
    return {
      success: true,
      transactionId,
      message: 'Payment approved'
    };
  } catch (error) {
    console.error('Card processing error:', error);
    return {
      success: false,
      message: error.message || 'Error processing card payment'
    };
  }
};

// Create a new payment
export const createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Payment request received:", req.body);
    console.log("File in request:", req.file);
    
    let { 
      orderId, 
      amount, 
      paymentMethod, 
      transactionId, 
      bankTransferDetails,
      bankSlip,
      cardDetails
    } = req.body;

    // Parse JSON string if it's in string format (from FormData)
    if (typeof bankTransferDetails === 'string') {
      try {
        bankTransferDetails = JSON.parse(bankTransferDetails);
        console.log("Parsed bankTransferDetails:", bankTransferDetails);
      } catch (err) {
        console.error("Error parsing bankTransferDetails:", err);
      }
    }

    // Validate request body
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, amount, and payment method are required'
      });
    }

    // Method-specific validation
    if (paymentMethod === 'bankTransfer') {
      console.log("Validating bank transfer details:", bankTransferDetails);
      if (!bankTransferDetails || typeof bankTransferDetails !== 'object' || 
          !bankTransferDetails.accountName || !bankTransferDetails.bankName || 
          !bankTransferDetails.transferDate || !bankTransferDetails.referenceNumber) {
        return res.status(400).json({
          success: false,
          message: 'Bank transfer details are required for bank transfer payments'
        });
      }
    } else if (paymentMethod === 'card') {
      if (!cardDetails || !cardDetails.number || !cardDetails.name || !cardDetails.expiry || !cardDetails.cvv) {
        return res.status(400).json({
          success: false,
          message: 'Card details are required for card payments'
        });
      }
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized
    if (order.user.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this order'
      });
    }

    // Check if order already has a completed payment
    const existingCompletedPayment = await Payment.findOne({
      order: orderId,
      status: 'completed'
    });

    if (existingCompletedPayment) {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Process payment based on method
    let paymentStatus = 'pending';
    let paymentTransactionId = transactionId;
    let paymentResponse = null;
    
    if (paymentMethod === 'card') {
      // Process card payment
      paymentResponse = await processCardPayment(cardDetails);
      
      if (paymentResponse.success) {
        paymentStatus = 'completed';
        paymentTransactionId = paymentResponse.transactionId;
      } else {
        return res.status(400).json({
          success: false,
          message: paymentResponse.message || 'Card payment failed'
        });
      }
    } else if (paymentMethod === 'bankTransfer') {
      // Bank transfers are set to pending until verified
      paymentStatus = 'pending';
    } else {
      // For other payment methods (like COD), set status based on configuration
      paymentStatus = paymentMethod === 'cash_on_delivery' ? 'pending' : 'completed';
    }

    // Create payment object
    const paymentData = {
      order: orderId,
      user: userId,
      amount,
      paymentMethod,
      transactionId: paymentTransactionId || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: paymentStatus
    };

    // Add method-specific details
    if (paymentMethod === 'bankTransfer' && bankTransferDetails) {
      paymentData.bankTransferDetails = {
        accountName: bankTransferDetails.accountName,
        bankName: bankTransferDetails.bankName,
        transferDate: new Date(bankTransferDetails.transferDate),
        referenceNumber: bankTransferDetails.referenceNumber
      };
      
      // Handle uploaded bank slip file
      if (req.file) {
        console.log("Bank slip file found in request:", req.file.originalname);
        try {
          // Import the file upload utility
          const uploadFile = (await import('../utils/fileUpload.js')).default;
          
          // Upload the file to the bank-slips folder
          const filePath = await uploadFile(req.file, 'bank-slips');
          console.log("File uploaded to path:", filePath);
          
          // Add the file info to the payment
          paymentData.bankSlip = {
            url: `http://localhost:4000/${filePath}`, // Use the appropriate server URL
            publicId: req.file.originalname || `bank-slip-${Date.now()}`
          };
          
          console.log('Bank slip uploaded successfully:', paymentData.bankSlip);
        } catch (fileError) {
          console.error('Error uploading bank slip file:', fileError);
          // Use a placeholder if file upload fails
          paymentData.bankSlip = { 
            url: 'http://localhost:4000/placeholder-bank-slip.jpg',
            publicId: `bank-slip-placeholder-${Date.now()}`
          };
          console.log('Using placeholder for bank slip');
        }
      } else if (bankSlip && Object.keys(bankSlip).length > 0) {
        console.log("Using provided bank slip info:", bankSlip);
        paymentData.bankSlip = bankSlip;
      } else {
        console.log("No bank slip file or data provided");
      }
    } else if (paymentMethod === 'card' && cardDetails) {
      // Store last 4 digits of card and type for reference
      // Never store full card details in your database
      paymentData.cardDetails = {
        lastFour: cardDetails.number.slice(-4),
        cardType: cardDetails.type || 'unknown'
      };
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Update order payment status
    order.paymentStatus = paymentStatus;
    await order.save();

    res.status(201).json({
      success: true,
      message: paymentMethod === 'bankTransfer' 
        ? 'Bank transfer payment recorded. Awaiting verification.' 
        : paymentMethod === 'card'
          ? 'Card payment processed successfully.'
          : 'Payment processed successfully.',
      data: payment,
      transaction: paymentResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

// Get all payments (admin only)
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('order')
      .populate('user', 'fName lName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// Get payments for user
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.find({ user: userId })
      .populate('order')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user payments',
      error: error.message
    });
  }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findById(id)
      .populate('order')
      .populate('user', 'fName lName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized
    if (payment.user._id.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

// Update payment status (admin only)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    // Validate request body
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Special handling for bank transfers
    if (payment.paymentMethod === 'bankTransfer') {
      // Add admin notes if provided
      if (adminNote) {
        payment.adminNote = adminNote;
      }
    }

    // Update payment status
    payment.status = status;
    await payment.save();

    // Update order payment status if needed
    if (status === 'completed' || status === 'refunded') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = status;
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
};

// Delete payment (admin only)
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Only allow deletion of failed or pending payments
    if (payment.status === 'completed' || payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed or refunded payments'
      });
    }

    await Payment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error.message
    });
  }
};

// Process card payment
export const processCardPaymentEndpoint = async (req, res) => {
  try {
    console.log("Card payment endpoint received request:", req.body);
    
    const userId = req.user.id;
    const { orderId, cardDetails } = req.body;
    
    // Simplified validation for testing
    if (!orderId) {
      console.log("Missing orderId");
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is authorized
    if (order.user.toString() !== userId && req.user.role !== 'ADMIN') {
      console.log(`User ${userId} not authorized for order ${orderId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this order'
      });
    }
    
    // Check if order already has a completed payment
    const existingCompletedPayment = await Payment.findOne({
      order: orderId,
      status: 'completed'
    });
    
    if (existingCompletedPayment) {
      console.log(`Order ${orderId} already has completed payment`);
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }
    
    // Process card payment - simplified for testing
    const paymentResult = {
      success: true,
      transactionId: `CARD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      message: 'Payment approved'
    };
    
    console.log("Payment processing result:", paymentResult);
    
    // Create payment record
    const payment = new Payment({
      order: orderId,
      user: userId,
      amount: order.totalAmount,
      paymentMethod: 'card',
      transactionId: paymentResult.transactionId,
      status: 'completed',
      cardDetails: {
        lastFour: cardDetails && cardDetails.number ? cardDetails.number.slice(-4) : '1234',
        cardType: cardDetails && cardDetails.type ? cardDetails.type : 'visa'
      }
    });
    
    await payment.save();
    console.log(`Payment record created: ${payment._id}`);
    
    // Update order payment status
    order.paymentStatus = 'completed';
    
    // Move order to processing status if it was pending
    if (order.status === 'pending') {
      order.status = 'processing';
    }
    
    await order.save();
    console.log(`Order ${orderId} updated with payment status: ${order.paymentStatus}`);
    
    res.status(200).json({
      success: true,
      message: 'Card payment processed successfully',
      data: {
        payment,
        order
      }
    });
    
  } catch (error) {
    console.error('Error processing card payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing card payment',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
};

// Generate and download an e-receipt for a payment
export const generateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the payment
    const payment = await Payment.findById(id)
      .populate({
        path: 'order',
        populate: {
          path: 'items.product',
          model: 'ShopProduct',
          select: 'name images price'
        }
      })
      .populate('user', 'fName lName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized (either the payment owner or an admin)
    if (payment.user._id.toString() !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment receipt'
      });
    }

    // Import modules using dynamic import instead of require
    const [PDFDocument, fs, path] = await Promise.all([
      import('pdfkit').then(module => module.default),
      import('fs').then(module => module.default),
      import('path').then(module => module.default)
    ]);

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.paymentId}.pdf"`);

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add company logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 150 });
      } else {
        // Draw text logo if image is not available
        doc.fontSize(24).font('Helvetica-Bold').text('DATAVERSE IT SOLUTIONS', 50, 45, { align: 'left' });
        doc.fontSize(10).font('Helvetica').text('Dataverse IT Solutions', 50, 75, { align: 'right' });
      }
    } catch (err) {
      console.error('Error adding logo to receipt:', err);
      // Just add text logo as fallback
      doc.fontSize(24).font('Helvetica-Bold').text('DATAVERSE IT SOLUTIONS', 50, 45, { align: 'left' });
      doc.fontSize(10).font('Helvetica').text('Dataverse IT Solutions', 50, 75, { align: 'right' });
    }

    // Add receipt title and payment info
    doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown();
    
    // Company info
    doc.fontSize(10).text('DATAVERSE IT SOLUTIONS', { align: 'right' });
    doc.fontSize(10).text('123 Tech Street', { align: 'right' });
    doc.fontSize(10).text('Digital City, DC 12345', { align: 'right' });
    doc.fontSize(10).text('Email: support@dataverseit.com', { align: 'right' });
    doc.moveDown();

    // Add line separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Payment details
    doc.fontSize(12).text('Payment Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Receipt Number: ${payment.paymentId}`);
    doc.fontSize(10).text(`Payment Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
    doc.fontSize(10).text(`Payment Method: ${payment.paymentMethod === 'card' ? 'Credit/Debit Card' : 
      payment.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : payment.paymentMethod}`);
    doc.fontSize(10).text(`Payment Status: ${payment.status}`);
    doc.fontSize(10).text(`Transaction ID: ${payment.transactionId || 'N/A'}`);
    doc.moveDown();

    // Customer details
    doc.fontSize(12).text('Customer Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Name: ${payment.user.fName} ${payment.user.lName}`);
    doc.fontSize(10).text(`Email: ${payment.user.email}`);
    doc.moveDown();

    // Order details
    if (payment.order) {
      doc.fontSize(12).text('Order Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Order ID: ${payment.order.orderId || payment.order._id}`);
      doc.fontSize(10).text(`Order Date: ${new Date(payment.order.createdAt).toLocaleDateString()}`);
      doc.fontSize(10).text(`Order Status: ${payment.order.status}`);
      doc.moveDown();

      // Items table
      if (payment.order.items && payment.order.items.length > 0) {
        doc.fontSize(12).text('Order Items', { underline: true });
        doc.moveDown(0.5);

        // Set up table layout
        const tableTop = doc.y;
        const itemX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 400;
        const totalX = 500;

        // Table headers
        doc.fontSize(10)
          .text('Item #', itemX, tableTop)
          .text('Description', descriptionX, tableTop)
          .text('Qty', quantityX, tableTop)
          .text('Price', priceX, tableTop)
          .text('Total', totalX, tableTop);

        // Draw a line below headers
        doc.moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Table rows
        let rowY = tableTop + 25;
        let subtotal = 0;

        payment.order.items.forEach((item, i) => {
          // Check if we're at the end of a page
          if (rowY > 700) {
            doc.addPage();
            rowY = 50;
            
            // Re-add headers on new page
            doc.fontSize(10)
              .text('Item #', itemX, rowY)
              .text('Description', descriptionX, rowY)
              .text('Qty', quantityX, rowY)
              .text('Price', priceX, rowY)
              .text('Total', totalX, rowY);
              
            // Draw a line below headers
            doc.moveTo(50, rowY + 15)
              .lineTo(550, rowY + 15)
              .stroke();
              
            rowY += 25;
          }
          
          const itemTotal = item.quantity * item.price;
          subtotal += itemTotal;
          
          // Safely handle product data
          let productName = item.name || 'Product'; // Use item.name if available
          try {
            if (item.product && item.product.name) {
              productName = item.product.name;
            }
          } catch (err) {
            console.warn('Error accessing product name:', err);
          }
          
          doc.fontSize(10)
            .text((i + 1).toString(), itemX, rowY)
            .text(productName, descriptionX, rowY, { width: 180, ellipsis: true })
            .text(item.quantity.toString(), quantityX, rowY)
            .text(`$${item.price.toFixed(2)}`, priceX, rowY)
            .text(`$${itemTotal.toFixed(2)}`, totalX, rowY);
            
          rowY += 20;
        });

        // Draw a line below items
        doc.moveTo(50, rowY)
          .lineTo(550, rowY)
          .stroke();
          
        rowY += 15;
        
        // Add totals
        const shipping = payment.order.shippingFee || 0;
        const tax = payment.order.taxAmount || 0;
        const discount = payment.order.discount || 0;
        
        doc.fontSize(10)
          .text('Subtotal:', 400, rowY)
          .text(`$${subtotal.toFixed(2)}`, totalX, rowY);
          
        rowY += 15;
        
        doc.fontSize(10)
          .text('Shipping:', 400, rowY)
          .text(`$${shipping.toFixed(2)}`, totalX, rowY);
          
        rowY += 15;
        
        doc.fontSize(10)
          .text('Tax:', 400, rowY)
          .text(`$${tax.toFixed(2)}`, totalX, rowY);
          
        if (discount > 0) {
          rowY += 15;
          doc.fontSize(10)
            .text('Discount:', 400, rowY)
            .text(`-$${discount.toFixed(2)}`, totalX, rowY);
        }
        
        rowY += 15;
        doc.moveTo(400, rowY)
          .lineTo(550, rowY)
          .stroke();
          
        rowY += 15;
        
        // Grand total
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Total:', 400, rowY)
          .text(`$${payment.amount.toFixed(2)}`, totalX, rowY);
      }
    }

    // Add footer
    doc.fontSize(10).text('Thank you for your business!', 50, 700, { align: 'center' });
    doc.fontSize(8).text('This is an electronically generated receipt and does not require a signature.', 50, 720, { align: 'center' });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: error.message
    });
  }
}; 